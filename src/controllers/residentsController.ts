import { Request, Response } from 'express';
import { pool } from '../lib/db';
import { generateTempPassword } from '../lib/generatePassword';
import bcrypt from 'bcryptjs';

const toResidentDto = (u: any) => ({
  id: u.id,
  full_name: u.name,
  email: u.email,
  phone: u.phone,
  block: u.block,
  building: u.building,
  apartment: u.apartment,
  resident_type: u.resident_type,
  status: u.status === 'ACTIVE' ? 'approved' : u.status === 'BANNED' ? 'deactivated' : (u.status || '').toLowerCase(),
  is_locked: u.is_locked,
  failed_login_count: u.failed_login_count,
  locked_at: u.locked_at,
  created_at: u.created_at,
});

export const listResidents = async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE role = 'RESIDENT' ORDER BY name ASC");
    res.json(result.rows.map(toResidentDto));
  } catch (error) {
    console.error('List Residents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deactivateResident = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE users SET status = 'BANNED', updated_at = NOW() WHERE id = $1 RETURNING *",
      [Number(id)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Resident not found' });
    res.json(toResidentDto(result.rows[0]));
  } catch (error: any) {
    console.error('Deactivate Resident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const reactivateResident = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE users SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1 RETURNING *",
      [Number(id)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Resident not found' });
    res.json(toResidentDto(result.rows[0]));
  } catch (error: any) {
    console.error('Reactivate Resident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteResident = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [Number(id)]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Resident not found' });
    res.json({ message: 'Resident removed' });
  } catch (error: any) {
    console.error('Delete Resident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const unlockResident = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const result = await pool.query(
      `UPDATE users
       SET password = $1, is_locked = false, failed_login_count = 0, locked_at = NULL, must_change_password = true, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [hashedPassword, Number(id)]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Resident not found' });
    const user = result.rows[0];

    res.json({
      email: user.email,
      password: tempPassword,
      full_name: user.name,
      whatsapp: user.phone,
    });
  } catch (error: any) {
    console.error('Unlock Resident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
