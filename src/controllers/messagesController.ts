import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import type { Message } from '@prisma/client';

const toMessageDto = (m: Message) => ({
  id: String(m.id),
  sender_id: String(m.senderId),
  recipient_id: String(m.recipientId),
  is_from_admin: m.isFromAdmin,
  content: m.content,
  attachment_url: m.attachmentUrl,
  attachment_name: m.attachmentName,
  attachment_type: m.attachmentType,
  read_at: m.readAt,
  created_at: m.createdAt,
});

// Resident helper: which admin should the chat open with?
// 1) whoever they last exchanged an admin message with, 2) fall back to any active admin.
export const getPeerAdmin = async (req: Request, res: Response) => {
  try {
    const meId = req.user!.userId;
    const lastAdminMessage = await prisma.message.findFirst({
      where: { isFromAdmin: true, OR: [{ senderId: meId }, { recipientId: meId }] },
      orderBy: { createdAt: 'desc' },
    });

    let adminId: number | null = lastAdminMessage
      ? lastAdminMessage.senderId === meId
        ? lastAdminMessage.recipientId
        : lastAdminMessage.senderId
      : null;

    if (!adminId) {
      const anyAdmin = await prisma.user.findFirst({
        where: { role: 'ADMIN', status: 'ACTIVE' },
        orderBy: { id: 'asc' },
      });
      adminId = anyAdmin?.id ?? null;
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

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: meId, recipientId: peerId },
          { senderId: peerId, recipientId: meId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    const unreadIds = messages.filter((m) => m.recipientId === meId && !m.readAt).map((m) => m.id);
    if (unreadIds.length > 0) {
      const now = new Date();
      await prisma.message.updateMany({ where: { id: { in: unreadIds } }, data: { readAt: now } });
      messages.forEach((m) => {
        if (unreadIds.includes(m.id)) m.readAt = now;
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

    const message = await prisma.message.create({
      data: {
        senderId: meId,
        recipientId: Number(recipient_id),
        isFromAdmin: isAdmin,
        content: content?.trim() || null,
        attachmentUrl: attachment_url || null,
        attachmentName: attachment_name || null,
        attachmentType: attachment_type || null,
      },
    });

    res.status(201).json(toMessageDto(message));
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

// Admin inbox: last message time + unread count per resident that has messaged the current admin.
export const listConversations = async (req: Request, res: Response) => {
  try {
    const meId = req.user!.userId;
    const messages = await prisma.message.findMany({
      where: { OR: [{ senderId: meId }, { recipientId: meId }] },
      orderBy: { createdAt: 'desc' },
      select: { senderId: true, recipientId: true, createdAt: true, readAt: true },
    });

    const lastBy = new Map<number, Date>();
    const unreadBy = new Map<number, number>();
    for (const m of messages) {
      const peer = m.senderId === meId ? m.recipientId : m.senderId;
      if (!lastBy.has(peer)) lastBy.set(peer, m.createdAt);
      if (m.recipientId === meId && !m.readAt) unreadBy.set(peer, (unreadBy.get(peer) || 0) + 1);
    }

    const result = Array.from(lastBy.entries()).map(([user_id, last_message_at]) => ({
      user_id,
      last_message_at,
      unread: unreadBy.get(user_id) || 0,
    }));

    res.json(result);
  } catch (error) {
    console.error('List Conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
