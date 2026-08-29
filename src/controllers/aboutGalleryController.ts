import { Request, Response } from 'express';
import { pool } from '../lib/db';

const toGalleryDto = (g: any) => ({
  id: String(g.id),
  image_url: g.image_url,
  title: g.title,
  display_order: g.display_order,
  created_at: g.created_at,
});

export const listImages = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM about_gallery ORDER BY display_order ASC, created_at DESC');
    res.json(result.rows.map(toGalleryDto));
  } catch (error) {
    console.error('List About Gallery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createImage = async (req: Request, res: Response) => {
  try {
    const { image_url, title, display_order } = req.body as {
      image_url: string; title?: string | null; display_order?: number;
    };

    if (!image_url) {
      return res.status(400).json({ error: 'image_url é obrigatório' });
    }

    const order = display_order ?? 0;

    const result = await pool.query(
      `INSERT INTO about_gallery (image_url, title, display_order)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [image_url, title || null, order]
    );

    res.status(201).json(toGalleryDto(result.rows[0]));
  } catch (error) {
    console.error('Create About Gallery Image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, display_order } = req.body as { title?: string | null; display_order?: number };

    const currentResult = await pool.query('SELECT * FROM about_gallery WHERE id = $1', [Number(id)]);
    if (currentResult.rows.length === 0) return res.status(404).json({ error: 'Image not found' });
    const current = currentResult.rows[0];

    const newTitle = title !== undefined ? title : current.title;
    const newOrder = display_order !== undefined ? display_order : current.display_order;

    const result = await pool.query(
      `UPDATE about_gallery SET title = $1, display_order = $2 WHERE id = $3 RETURNING *`,
      [newTitle, newOrder, Number(id)]
    );

    res.json(toGalleryDto(result.rows[0]));
  } catch (error) {
    console.error('Update About Gallery Image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteImage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM about_gallery WHERE id = $1 RETURNING id', [Number(id)]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Image not found' });
    res.json({ message: 'Imagem removida' });
  } catch (error) {
    console.error('Delete About Gallery Image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

import fs from 'fs';

export const uploadImage = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum ficheiro enviado' });
  }
  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const base64Data = fileBuffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64Data}`;
    
    // Remove temp file from disk
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({ url: dataUrl });
  } catch (err: any) {
    console.error('Upload image error:', err);
    res.status(500).json({ error: 'Erro ao processar imagem' });
  }
};
