import { Request, Response } from 'express';
import { pool } from '../lib/db';

const toNewsDto = (n: any) => ({
  id: n.id,
  title: n.title,
  summary: n.summary,
  content: n.content,
  category: n.category,
  image_url: n.image_url,
  gallery_urls: n.gallery_urls ? JSON.parse(n.gallery_urls) : null,
  created_at: n.created_at,
  updated_at: n.updated_at,
});

interface NewsInput {
  title?: string;
  summary?: string;
  content?: string;
  category?: string;
  image_url?: string | null;
  gallery_urls?: string[] | null;
}

// --- Admin ---

export const listNews = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM news ORDER BY created_at DESC');
    res.json(result.rows.map(toNewsDto));
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

    const title = body.title.trim();
    const summary = body.summary.trim();
    const content = body.content.trim();
    const category = body.category || 'Comunicado';
    const imageUrl = body.image_url || null;
    const galleryUrls = body.gallery_urls ? JSON.stringify(body.gallery_urls) : null;

    const result = await pool.query(
      `INSERT INTO news (title, summary, content, category, image_url, gallery_urls)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, summary, content, category, imageUrl, galleryUrls]
    );

    res.status(201).json(toNewsDto(result.rows[0]));
  } catch (error) {
    console.error('Create News error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateNews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as NewsInput;

    const currentResult = await pool.query('SELECT * FROM news WHERE id = $1', [Number(id)]);
    if (currentResult.rows.length === 0) return res.status(404).json({ error: 'News not found' });
    const current = currentResult.rows[0];

    const title = body.title !== undefined ? body.title : current.title;
    const summary = body.summary !== undefined ? body.summary : current.summary;
    const content = body.content !== undefined ? body.content : current.content;
    const category = body.category !== undefined ? body.category : current.category;
    const imageUrl = body.image_url !== undefined ? body.image_url : current.image_url;
    const galleryUrls = body.gallery_urls !== undefined ? (body.gallery_urls ? JSON.stringify(body.gallery_urls) : null) : current.gallery_urls;

    const result = await pool.query(
      `UPDATE news
       SET title = $1, summary = $2, content = $3, category = $4, image_url = $5, gallery_urls = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [title, summary, content, category, imageUrl, galleryUrls, Number(id)]
    );

    res.json(toNewsDto(result.rows[0]));
  } catch (error: any) {
    console.error('Update News error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteNews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM news WHERE id = $1 RETURNING id', [Number(id)]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'News not found' });
    res.json({ message: 'Notícia removida' });
  } catch (error: any) {
    console.error('Delete News error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

import fs from 'fs';

export const uploadNewsImage = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum ficheiro enviado' });
  }
  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const base64Data = fileBuffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64Data}`;
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.json({ url: dataUrl });
  } catch (err) {
    console.error('Upload news image error:', err);
    res.status(500).json({ error: 'Erro ao processar imagem' });
  }
};

// --- Public ---

export const listPublicNews = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM news ORDER BY created_at DESC');
    res.json(result.rows.map(toNewsDto));
  } catch (error) {
    console.error('List Public News error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
