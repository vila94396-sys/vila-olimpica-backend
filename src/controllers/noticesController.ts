import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import type { Notice } from '@prisma/client';

const toNoticeDto = (n: Notice) => ({
  id: n.id,
  title: n.title,
  content: n.content,
  priority: n.priority,
  is_active: n.isActive,
  created_at: n.createdAt,
  updated_at: n.updatedAt,
});

interface NoticeInput {
  title?: string;
  content?: string;
  priority?: string;
  is_active?: boolean;
}

const toPrismaData = (body: NoticeInput) => ({
  ...(body.title !== undefined && { title: body.title }),
  ...(body.content !== undefined && { content: body.content }),
  ...(body.priority !== undefined && { priority: body.priority }),
  ...(body.is_active !== undefined && { isActive: body.is_active }),
});

// --- Admin ---

export const listNotices = async (req: Request, res: Response) => {
  try {
    const notices = await prisma.notice.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(notices.map(toNoticeDto));
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
    const notice = await prisma.notice.create({
      data: { title: body.title.trim(), content: body.content, ...toPrismaData({ priority: body.priority, is_active: body.is_active }) },
    });
    res.status(201).json(toNoticeDto(notice));
  } catch (error) {
    console.error('Create Notice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateNotice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notice = await prisma.notice.update({
      where: { id: Number(id) },
      data: toPrismaData(req.body as NoticeInput),
    });
    res.json(toNoticeDto(notice));
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Notice not found' });
    console.error('Update Notice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteNotice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.notice.delete({ where: { id: Number(id) } });
    res.json({ message: 'Aviso removido' });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Notice not found' });
    console.error('Delete Notice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Public ---

export const listPublicNotices = async (req: Request, res: Response) => {
  try {
    const notices = await prisma.notice.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notices.map(toNoticeDto));
  } catch (error) {
    console.error('List Public Notices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
