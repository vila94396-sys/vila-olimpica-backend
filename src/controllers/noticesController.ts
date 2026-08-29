import { Request, Response } from 'express';
import { pool } from '../lib/db';

const toNoticeDto = (n: any) => ({
  id: n.id,
  title: n.title,
  content: n.content,
  priority: n.priority,
  is_active: n.is_active,
  created_at: n.created_at,
  updated_at: n.updated_at,
});

interface NoticeInput {
  title?: string;
  content?: string;
  priority?: string;
  is_active?: boolean;
}

// --- Admin ---

export const listNotices = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM notices ORDER BY created_at DESC');
    res.json(result.rows.map(toNoticeDto));
  } catch (error) {
    console.error('List Notices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createNotice = async (req: Request, res: Response) => {
  try {
    const body = req.body as NoticeInput;
    if (!body.title?.trim() || !body.content?.trim()) {
      return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
    }

    const title = body.title.trim();
    const content = body.content;
    const priority = body.priority || 'normal';
    const isActive = body.is_active !== undefined ? body.is_active : true;

    const result = await pool.query(
      `INSERT INTO notices (title, content, priority, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [title, content, priority, isActive]
    );

    res.status(201).json(toNoticeDto(result.rows[0]));
  } catch (error) {
    console.error('Create Notice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateNotice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as NoticeInput;

    const currentResult = await pool.query('SELECT * FROM notices WHERE id = $1', [Number(id)]);
    if (currentResult.rows.length === 0) return res.status(404).json({ error: 'Notice not found' });
    const current = currentResult.rows[0];

    const title = body.title !== undefined ? body.title : current.title;
    const content = body.content !== undefined ? body.content : current.content;
    const priority = body.priority !== undefined ? body.priority : current.priority;
    const isActive = body.is_active !== undefined ? body.is_active : current.is_active;

    const result = await pool.query(
      `UPDATE notices
       SET title = $1, content = $2, priority = $3, is_active = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [title, content, priority, isActive, Number(id)]
    );

    res.json(toNoticeDto(result.rows[0]));
  } catch (error: any) {
    console.error('Update Notice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteNotice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM notices WHERE id = $1 RETURNING id', [Number(id)]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notice not found' });
    res.json({ message: 'Aviso removido' });
  } catch (error: any) {
    console.error('Delete Notice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Public ---

export const listPublicNotices = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM notices WHERE is_active = true ORDER BY created_at DESC');
    res.json(result.rows.map(toNoticeDto));
  } catch (error) {
    console.error('List Public Notices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
