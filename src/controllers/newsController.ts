import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import type { News } from '@prisma/client';

const toNewsDto = (n: News) => ({
  id: n.id,
  title: n.title,
  summary: n.summary,
  content: n.content,
  category: n.category,
  image_url: n.imageUrl,
  gallery_urls: n.galleryUrls ? (JSON.parse(n.galleryUrls) as string[]) : null,
  created_at: n.createdAt,
  updated_at: n.updatedAt,
});

interface NewsInput {
  title?: string;
  summary?: string;
  content?: string;
  category?: string;
  image_url?: string | null;
  gallery_urls?: string[] | null;
}

const toPrismaData = (body: NewsInput) => ({
  ...(body.title !== undefined && { title: body.title }),
  ...(body.summary !== undefined && { summary: body.summary }),
  ...(body.content !== undefined && { content: body.content }),
  ...(body.category !== undefined && { category: body.category }),
  ...(body.image_url !== undefined && { imageUrl: body.image_url }),
  ...(body.gallery_urls !== undefined && { galleryUrls: body.gallery_urls ? JSON.stringify(body.gallery_urls) : null }),
});

// --- Admin ---

export const listNews = async (req: Request, res: Response) => {
  try {
    const news = await prisma.news.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(news.map(toNewsDto));
  } catch (error) {
    console.error('List News error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createNews = async (req: Request, res: Response) => {
  try {
    const body = req.body as NewsInput;
    if (!body.title?.trim() || !body.summary?.trim() || !body.content?.trim()) {
      return res.status(400).json({ error: 'Título, resumo e conteúdo são obrigatórios' });
    }
    const news = await prisma.news.create({
      data: {
        title: body.title.trim(),
        summary: body.summary,
        content: body.content,
        category: body.category || 'Comunicado',
        ...toPrismaData({ image_url: body.image_url, gallery_urls: body.gallery_urls }),
      },
    });
    res.status(201).json(toNewsDto(news));
  } catch (error) {
    console.error('Create News error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateNews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const news = await prisma.news.update({
      where: { id: Number(id) },
      data: toPrismaData(req.body as NewsInput),
    });
    res.json(toNewsDto(news));
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'News not found' });
    console.error('Update News error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteNews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.news.delete({ where: { id: Number(id) } });
    res.json({ message: 'Notícia removida' });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'News not found' });
    console.error('Delete News error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const uploadNewsImage = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum ficheiro enviado' });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
};

// --- Public ---

export const listPublicNews = async (req: Request, res: Response) => {
  try {
    const news = await prisma.news.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(news.map(toNewsDto));
  } catch (error) {
    console.error('List Public News error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
