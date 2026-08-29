import { Request, Response } from 'express';
import { pool } from '../lib/db';

const toMessageDto = (m: any) => ({
  id: String(m.id),
  sender_id: String(m.sender_id),
  recipient_id: String(m.recipient_id),
  is_from_admin: m.is_from_admin,
  content: m.content,
  attachment_url: m.attachment_url,
  attachment_name: m.attachment_name,
  attachment_type: m.attachment_type,
  read_at: m.read_at,
  created_at: m.created_at,
});

export const getPeerAdmin = async (req: Request, res: Response) => {
  try {
    const meId = req.user!.userId;
    const lastMsgResult = await pool.query(
      `SELECT * FROM messages
       WHERE is_from_admin = true AND (sender_id = $1 OR recipient_id = $1)
       ORDER BY created_at DESC LIMIT 1`,
      [meId]
    );

    let adminId: number | null = null;
    if (lastMsgResult.rows.length > 0) {
      const msg = lastMsgResult.rows[0];
      adminId = msg.sender_id === meId ? msg.recipient_id : msg.sender_id;
    }

    if (!adminId) {
      const anyAdminResult = await pool.query(
        "SELECT id FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE' ORDER BY id ASC LIMIT 1"
      );
      adminId = anyAdminResult.rows[0]?.id ?? null;
    }

    res.json({ admin_id: adminId });
  } catch (error) {
    console.error('Get Peer Admin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getThread = async (req: Request, res: Response) => {
  try {
    const meId = req.user!.userId;
    const peerId = Number(req.params.peerId);

    const result = await pool.query(
      `SELECT * FROM messages
       WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
       ORDER BY created_at ASC`,
      [meId, peerId]
    );

    const messages = result.rows;
    const unreadIds = messages.filter((m) => m.recipient_id === meId && !m.read_at).map((m) => m.id);

    if (unreadIds.length > 0) {
      const now = new Date();
      await pool.query(
        'UPDATE messages SET read_at = $1, updated_at = NOW() WHERE id = ANY($2::int[])',
        [now, unreadIds]
      );
      messages.forEach((m) => {
        if (unreadIds.includes(m.id)) m.read_at = now;
      });
    }

    res.json(messages.map(toMessageDto));
  } catch (error) {
    console.error('Get Thread error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const meId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';
    const { recipient_id, content, attachment_url, attachment_name, attachment_type } = req.body as {
      recipient_id?: number | string;
      content?: string | null;
      attachment_url?: string | null;
      attachment_name?: string | null;
      attachment_type?: string | null;
    };

    if (!recipient_id || (!content?.trim() && !attachment_url)) {
      return res.status(400).json({ error: 'Destinatário e conteúdo ou anexo são obrigatórios' });
    }

    const result = await pool.query(
      `INSERT INTO messages (sender_id, recipient_id, is_from_admin, content, attachment_url, attachment_name, attachment_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        meId,
        Number(recipient_id),
        isAdmin,
        content?.trim() || null,
        attachment_url || null,
        attachment_name || null,
        attachment_type || null,
      ]
    );

    res.status(201).json(toMessageDto(result.rows[0]));
  } catch (error) {
    console.error('Send Message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const uploadAttachment = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum ficheiro enviado' });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
};

export const listConversations = async (req: Request, res: Response) => {
  try {
    const meId = req.user!.userId;
    const result = await pool.query(
      `SELECT sender_id, recipient_id, created_at, read_at
       FROM messages
       WHERE sender_id = $1 OR recipient_id = $1
       ORDER BY created_at DESC`,
      [meId]
    );

    const messages = result.rows;
    const lastBy = new Map<number, Date>();
    const unreadBy = new Map<number, number>();

    for (const m of messages) {
      const peer = m.sender_id === meId ? m.recipient_id : m.sender_id;
      if (!lastBy.has(peer)) lastBy.set(peer, m.created_at);
      if (m.recipient_id === meId && !m.read_at) unreadBy.set(peer, (unreadBy.get(peer) || 0) + 1);
    }

    const resArray = Array.from(lastBy.entries()).map(([user_id, last_message_at]) => ({
      user_id,
      last_message_at,
      unread: unreadBy.get(user_id) || 0,
    }));

    res.json(resArray);
  } catch (error) {
    console.error('List Conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
