import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../lib/db';
import { generateTempPassword } from '../lib/generatePassword';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, status`,
      [email, hashedPassword, name || email.split('@')[0], 'RESIDENT']
    );

    const user = result.rows[0];

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '7d',
    });

    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status }, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const MAX_LOGIN_ATTEMPTS = 3;

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'User account is not active' });
    }

    if (user.is_locked) {
      return res.status(403).json({ error: 'Account locked due to too many failed attempts. Contact the administrator.', locked: true });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const newCount = (user.failed_login_count || 0) + 1;
      const shouldLock = newCount >= MAX_LOGIN_ATTEMPTS;
      await pool.query(
        `UPDATE users
         SET failed_login_count = $1, is_locked = $2, locked_at = $3
         WHERE id = $4`,
        [newCount, shouldLock, shouldLock ? new Date() : null, user.id]
      );
      return res.status(400).json({
        error: 'Invalid credentials',
        locked: shouldLock,
        remaining: Math.max(0, MAX_LOGIN_ATTEMPTS - newCount),
      });
    }

    if (user.failed_login_count > 0) {
      await pool.query('UPDATE users SET failed_login_count = 0 WHERE id = $1', [user.id]);
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '7d',
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        mustChangePassword: user.must_change_password,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const requestAccess = async (req: Request, res: Response) => {
  try {
    const { full_name, block, building, apartment, resident_type, phone, whatsapp, email } = req.body;

    if (!email || !full_name) {
      return res.status(400).json({ error: 'Email and full_name are required' });
    }

    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const existingRequest = await pool.query('SELECT * FROM access_requests WHERE email = $1', [email]);
    if (existingRequest.rows.length > 0) {
      return res.status(400).json({ error: `A request with this email already exists and is ${existingRequest.rows[0].status}` });
    }

    const result = await pool.query(
      `INSERT INTO access_requests (full_name, block, building, apartment, resident_type, phone, whatsapp, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [full_name, block || '', building || '', apartment || '', resident_type || '', phone || '', whatsapp || '', email]
    );

    res.status(201).json({ message: 'Access request submitted successfully', accessRequest: result.rows[0] });
  } catch (error) {
    console.error('Request Access error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAccessRequests = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM access_requests ORDER BY created_at DESC');
    res.json(result.rows.map((r) => ({
      id: r.id,
      full_name: r.full_name,
      block: r.block,
      building: r.building,
      apartment: r.apartment,
      resident_type: r.resident_type,
      phone: r.phone,
      whatsapp: r.whatsapp,
      email: r.email,
      status: (r.status || '').toLowerCase(),
      created_at: r.created_at,
    })));
  } catch (error) {
    console.error('Get Access Requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveAccess = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const accessReqResult = await pool.query('SELECT * FROM access_requests WHERE id = $1', [Number(id)]);
    if (accessReqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Access request not found' });
    }

    const accessRequest = accessReqResult.rows[0];

    if (accessRequest.status !== 'APPROVED' && accessRequest.status !== 'PENDING') {
      return res.status(400).json({ error: `Request is already ${accessRequest.status}` });
    }
    if (accessRequest.status === 'APPROVED') {
      return res.status(400).json({ error: 'Request is already APPROVED' });
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [accessRequest.email]);

    let user;
    if (existingUser.rows.length > 0) {
      const updateRes = await pool.query(
        `UPDATE users
         SET password = $1, name = $2, phone = $3, block = $4, building = $5, apartment = $6, resident_type = $7, status = $8, must_change_password = $9, updated_at = NOW()
         WHERE id = $10
         RETURNING *`,
        [
          hashedPassword,
          accessRequest.full_name,
          accessRequest.phone,
          accessRequest.block,
          accessRequest.building,
          accessRequest.apartment,
          accessRequest.resident_type,
          'ACTIVE',
          true,
          existingUser.rows[0].id,
        ]
      );
      user = updateRes.rows[0];
    } else {
      const createRes = await pool.query(
        `INSERT INTO users (email, password, name, phone, block, building, apartment, resident_type, status, role, must_change_password)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          accessRequest.email,
          hashedPassword,
          accessRequest.full_name,
          accessRequest.phone,
          accessRequest.block,
          accessRequest.building,
          accessRequest.apartment,
          accessRequest.resident_type,
          'ACTIVE',
          'RESIDENT',
          true,
        ]
      );
      user = createRes.rows[0];
    }

    await pool.query("UPDATE access_requests SET status = 'APPROVED', updated_at = NOW() WHERE id = $1", [Number(id)]);

    res.json({
      message: 'Request approved and user created',
      email: user.email,
      password: tempPassword,
      full_name: accessRequest.full_name,
      whatsapp: accessRequest.whatsapp || accessRequest.phone,
    });
  } catch (error) {
    console.error('Approve Access error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const rejectAccess = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "UPDATE access_requests SET status = 'REJECTED', updated_at = NOW() WHERE id = $1 RETURNING *",
      [Number(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Access request not found' });
    }

    res.json({ message: 'Request rejected', accessRequest: result.rows[0] });
  } catch (error) {
    console.error('Reject Access error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAccessRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const accessReqResult = await pool.query('SELECT * FROM access_requests WHERE id = $1', [Number(id)]);
    if (accessReqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Access request not found' });
    }

    const accessRequest = accessReqResult.rows[0];

    if (accessRequest.status === 'APPROVED') {
      return res.status(400).json({ error: 'Pedidos aprovados não podem ser eliminados — a conta do morador está activa.' });
    }

    await pool.query('DELETE FROM access_requests WHERE id = $1', [Number(id)]);

    res.json({ message: 'Access request deleted' });
  } catch (error) {
    console.error('Delete Access Request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
