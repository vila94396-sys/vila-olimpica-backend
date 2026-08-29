import { Request, Response } from 'express';
import { pool } from '../lib/db';

const toReservationDto = (r: any) => ({
  id: String(r.id),
  user_id: String(r.user_id),
  area_id: String(r.area_id),
  reservation_date: r.reservation_date ? (typeof r.reservation_date === 'string' ? r.reservation_date.substring(0, 10) : new Date(r.reservation_date).toISOString().substring(0, 10)) : '',
  start_time: r.start_time,
  end_time: r.end_time,
  status: r.status,
  notes: r.notes,
  created_at: r.created_at,
  common_areas: r.area_name ? { name: r.area_name } : undefined,
});

export const listAreas = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM common_areas ORDER BY id ASC');
    res.json(result.rows.map((a) => ({
      id: String(a.id),
      name: a.name,
      description: a.description,
      capacity: a.capacity,
      rules: a.rules,
    })));
  } catch (error) {
    console.error('List Areas error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listReservations = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT r.*, a.name as area_name
      FROM reservations r
      JOIN common_areas a ON r.area_id = a.id
      ORDER BY r.reservation_date DESC, r.start_time DESC
    `);
    res.json(result.rows.map(toReservationDto));
  } catch (error) {
    console.error('List Reservations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listMyReservations = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await pool.query(`
      SELECT r.*, a.name as area_name
      FROM reservations r
      JOIN common_areas a ON r.area_id = a.id
      WHERE r.user_id = $1
      ORDER BY r.reservation_date DESC, r.start_time DESC
    `, [userId]);
    res.json(result.rows.map(toReservationDto));
  } catch (error) {
    console.error('List My Reservations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createReservation = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { area_id, reservation_date, start_time, end_time, notes } = req.body as {
      area_id: number | string;
      reservation_date: string;
      start_time: string;
      end_time: string;
      notes?: string | null;
    };

    if (!area_id || !reservation_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Área, data e horários são obrigatórios' });
    }

    // Check for conflicting confirmed/pending reservation
    const conflict = await pool.query(`
      SELECT id FROM reservations
      WHERE area_id = $1 AND reservation_date = $2
        AND status IN ('pending', 'confirmed')
        AND NOT (end_time <= $3 OR start_time >= $4)
    `, [Number(area_id), reservation_date, start_time, end_time]);

    if (conflict.rows.length > 0) {
      return res.status(409).json({ error: 'Já existe uma reserva pendente ou confirmada para este horário e área.' });
    }

    const result = await pool.query(`
      INSERT INTO reservations (user_id, area_id, reservation_date, start_time, end_time, notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING *
    `, [userId, Number(area_id), reservation_date, start_time, end_time, notes || null]);

    const areaRes = await pool.query('SELECT name FROM common_areas WHERE id = $1', [Number(area_id)]);
    const row = result.rows[0];
    row.area_name = areaRes.rows[0]?.name;

    res.status(201).json(toReservationDto(row));
  } catch (error) {
    console.error('Create Reservation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateReservationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: string };

    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    const result = await pool.query(`
      UPDATE reservations
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, Number(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva não encontrada' });
    }

    const areaRes = await pool.query('SELECT name FROM common_areas WHERE id = $1', [result.rows[0].area_id]);
    const row = result.rows[0];
    row.area_name = areaRes.rows[0]?.name;

    res.json(toReservationDto(row));
  } catch (error) {
    console.error('Update Reservation Status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteReservation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    let query = 'DELETE FROM reservations WHERE id = $1';
    const params: any[] = [Number(id)];

    if (!isAdmin) {
      query += ' AND user_id = $2';
      params.push(userId);
    }
    query += ' RETURNING id';

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva não encontrada ou sem permissão' });
    }

    res.json({ message: 'Reserva excluída com sucesso' });
  } catch (error) {
    console.error('Delete Reservation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
