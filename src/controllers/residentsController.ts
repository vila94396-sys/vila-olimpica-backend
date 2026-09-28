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
      "UPDATE users SET status = 'BANNED', token_version = token_version + 1, updated_at = NOW() WHERE id = $1 RETURNING *",
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
      "UPDATE users SET status = 'ACTIVE', token_version = token_version + 1, updated_at = NOW() WHERE id = $1 RETURNING *",
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
       SET password = $1, is_locked = false, failed_login_count = 0, locked_at = NULL, must_change_password = true, token_version = token_version + 1, updated_at = NOW()
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

// Resident scoped fee endpoints used by the resident portal.
export const listMyFees = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const result = await pool.query(
      `SELECT 'ffh-' || f.id AS id, f.unidade_id, LPAD(f.reference_month::text, 2, '0') AS reference_month, f.reference_year,
              f.amount, f.valor_pago, f.due_date, LOWER(f.status) AS status, f.paid_at,
              f.payment_method, f.receipt_url, f.created_at
       FROM condominium_fees f JOIN unidades u ON u.id = f.unidade_id
       WHERE u.user_id = $1
       UNION ALL
       SELECT 'fpd-' || f.id AS id, f.unidade_id, LPAD(f.reference_month::text, 2, '0') AS reference_month, f.reference_year,
              f.amount, f.valor_pago, f.due_date, LOWER(f.status) AS status, f.paid_at,
              f.payment_method, f.receipt_url, f.created_at
       FROM fpd_fees f JOIN fpd_unidades u ON u.id = f.unidade_id
       WHERE u.user_id = $1
       ORDER BY reference_year DESC, reference_month DESC`, [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('List resident fees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyUnidade = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const result = await pool.query(
      `SELECT id, divida_anterior, pagamentos_historicos FROM unidades WHERE user_id = $1
       UNION ALL
       SELECT id, divida_anterior, pagamentos_historicos FROM fpd_unidades WHERE user_id = $1
       LIMIT 1`, [userId]
    );
    res.json(result.rows[0] ?? null);
  } catch (error) {
    console.error('Get resident unidade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const parseFeeId = (value: string) => {
  const match = /^(ffh|fpd)-(\d+)$/.exec(value);
  return match ? { table: match[1] === 'ffh' ? 'condominium_fees' : 'fpd_fees', id: Number(match[2]) } : null;
};

export const uploadMyFeeReceipt = async (req: Request, res: Response) => {
  const fee = parseFeeId(String(req.params.feeId || ''));
  if (!fee || !req.file) return res.status(400).json({ error: 'Invalid fee or missing receipt image' });
  try {
    const result = await pool.query(
      `SELECT f.id FROM ${fee.table} f JOIN ${fee.table === 'fpd_fees' ? 'fpd_unidades' : 'unidades'} u ON u.id = f.unidade_id
       WHERE f.id = $1 AND u.user_id = $2`, [fee.id, req.user?.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Fee not found' });
    res.json({ url: `/uploads/${req.file.filename}` });
  } catch (error) {
    console.error('Upload resident fee receipt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const submitMyFeeReceipt = async (req: Request, res: Response) => {
  const fee = parseFeeId(String(req.params.feeId || ''));
  const receiptUrl = typeof req.body.receipt_url === 'string' ? req.body.receipt_url : '';
  if (!fee || !receiptUrl.startsWith('/uploads/')) return res.status(400).json({ error: 'Invalid fee or receipt' });
  try {
    const unitTable = fee.table === 'fpd_fees' ? 'fpd_unidades' : 'unidades';
    const result = await pool.query(
      `UPDATE ${fee.table} f SET receipt_url = $1, payment_method = 'bank_transfer', status = 'PENDING_VERIFICATION', updated_at = NOW()
       FROM ${unitTable} u WHERE f.unidade_id = u.id AND f.id = $2 AND u.user_id = $3 AND UPPER(f.status) <> 'PAID'
       RETURNING f.id`, [receiptUrl, fee.id, req.user?.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Fee not found' });
    res.json({ message: 'Receipt submitted for verification' });
  } catch (error) {
    console.error('Submit resident fee receipt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
