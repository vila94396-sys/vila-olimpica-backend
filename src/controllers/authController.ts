import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { generateTempPassword } from '../lib/generatePassword';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        role: 'RESIDENT',
      },
    });

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

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'User account is not active' });
    }

    if (user.isLocked) {
      return res.status(403).json({ error: 'Account locked due to too many failed attempts. Contact the administrator.', locked: true });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const newCount = user.failedLoginCount + 1;
      const shouldLock = newCount >= MAX_LOGIN_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: newCount,
          isLocked: shouldLock,
          lockedAt: shouldLock ? new Date() : null,
        },
      });
      return res.status(400).json({
        error: 'Invalid credentials',
        locked: shouldLock,
        remaining: Math.max(0, MAX_LOGIN_ATTEMPTS - newCount),
      });
    }

    if (user.failedLoginCount > 0) {
      await prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0 } });
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
        mustChangePassword: user.mustChangePassword,
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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Check if request already exists
    const existingRequest = await prisma.accessRequest.findUnique({ where: { email } });
    if (existingRequest) {
      return res.status(400).json({ error: `A request with this email already exists and is ${existingRequest.status}` });
    }

    const accessRequest = await prisma.accessRequest.create({
      data: {
        fullName: full_name,
        block: block || '',
        building: building || '',
        apartment: apartment || '',
        residentType: resident_type || '',
        phone: phone || '',
        whatsapp: whatsapp || '',
        email,
      },
    });

    res.status(201).json({ message: 'Access request submitted successfully', accessRequest });
  } catch (error) {
    console.error('Request Access error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAccessRequests = async (req: Request, res: Response) => {
  try {
    const requests = await prisma.accessRequest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests.map((r) => ({
      id: r.id,
      full_name: r.fullName,
      block: r.block,
      building: r.building,
      apartment: r.apartment,
      resident_type: r.residentType,
      phone: r.phone,
      whatsapp: r.whatsapp,
      email: r.email,
      status: r.status.toLowerCase(),
      created_at: r.createdAt,
    })));
  } catch (error) {
    console.error('Get Access Requests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const approveAccess = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const accessRequest = await prisma.accessRequest.findUnique({ where: { id: Number(id) } });
    if (!accessRequest) {
      return res.status(404).json({ error: 'Access request not found' });
    }

    if (accessRequest.status !== 'PENDING') {
      return res.status(400).json({ error: `Request is already ${accessRequest.status}` });
    }

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const existingUser = await prisma.user.findUnique({ where: { email: accessRequest.email } });

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            password: hashedPassword,
            name: accessRequest.fullName,
            phone: accessRequest.phone,
            block: accessRequest.block,
            building: accessRequest.building,
            apartment: accessRequest.apartment,
            residentType: accessRequest.residentType,
            status: 'ACTIVE',
            mustChangePassword: true,
          },
        })
      : await prisma.user.create({
          data: {
            email: accessRequest.email,
            password: hashedPassword,
            name: accessRequest.fullName,
            phone: accessRequest.phone,
            block: accessRequest.block,
            building: accessRequest.building,
            apartment: accessRequest.apartment,
            residentType: accessRequest.residentType,
            status: 'ACTIVE',
            role: 'RESIDENT',
            mustChangePassword: true,
          },
        });

    await prisma.accessRequest.update({
      where: { id: Number(id) },
      data: { status: 'APPROVED' },
    });

    res.json({
      message: 'Request approved and user created',
      email: user.email,
      password: tempPassword,
      full_name: accessRequest.fullName,
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

    const accessRequest = await prisma.accessRequest.update({
      where: { id: Number(id) },
      data: { status: 'REJECTED' }
    });

    res.json({ message: 'Request rejected', accessRequest });
  } catch (error) {
    console.error('Reject Access error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteAccessRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const accessRequest = await prisma.accessRequest.findUnique({ where: { id: Number(id) } });
    if (!accessRequest) {
      return res.status(404).json({ error: 'Access request not found' });
    }

    if (accessRequest.status === 'APPROVED') {
      return res.status(400).json({ error: 'Pedidos aprovados não podem ser eliminados — a conta do morador está activa.' });
    }

    await prisma.accessRequest.delete({ where: { id: Number(id) } });

    res.json({ message: 'Access request deleted' });
  } catch (error) {
    console.error('Delete Access Request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
