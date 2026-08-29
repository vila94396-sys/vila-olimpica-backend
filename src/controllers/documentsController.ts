import { Request, Response } from 'express';
import { pool } from '../lib/db';

const toDocumentDto = (d: any) => ({
  id: d.id,
  title: d.title,
  description: d.description,
  category: d.category,
  folder: d.folder,
  year: d.year,
  file_url: d.file_url,
  file_name: d.file_name,
  file_size: d.file_size,
  file_type: d.file_type,
  created_at: d.created_at,
  updated_at: d.updated_at,
});

interface DocumentInput {
  title?: string;
  description?: string | null;
  category?: string;
  folder?: string | null;
  year?: number | null;
  file_url?: string;
  file_name?: string;
  file_size?: string | null;
  file_type?: string | null;
}

// --- Admin ---

export const listDocuments = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM documents ORDER BY year DESC NULLS LAST, created_at DESC');
    res.json(result.rows.map(toDocumentDto));
  } catch (error) {
    console.error('List Documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createDocument = async (req: Request, res: Response) => {
  try {
    const body = req.body as DocumentInput;
    if (!body.title?.trim() || !body.category || !body.file_url || !body.file_name) {
      return res.status(400).json({ error: 'Título, categoria e ficheiro são obrigatórios' });
    }

    const title = body.title.trim();
    const description = body.description || null;
    const category = body.category;
    const folder = body.folder || 'Geral';
    const year = body.year ?? null;
    const fileUrl = body.file_url;
    const fileName = body.file_name;
    const fileSize = body.file_size || null;
    const fileType = body.file_type || null;

    const result = await pool.query(
      `INSERT INTO documents (title, description, category, folder, year, file_url, file_name, file_size, file_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [title, description, category, folder, year, fileUrl, fileName, fileSize, fileType]
    );

    res.status(201).json(toDocumentDto(result.rows[0]));
  } catch (error) {
    console.error('Create Document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as DocumentInput;

    const currentResult = await pool.query('SELECT * FROM documents WHERE id = $1', [Number(id)]);
    if (currentResult.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    const current = currentResult.rows[0];

    const title = body.title !== undefined ? body.title : current.title;
    const description = body.description !== undefined ? body.description : current.description;
    const category = body.category !== undefined ? body.category : current.category;
    const folder = body.folder !== undefined ? body.folder : current.folder;
    const year = body.year !== undefined ? body.year : current.year;
    const fileUrl = body.file_url !== undefined ? body.file_url : current.file_url;
    const fileName = body.file_name !== undefined ? body.file_name : current.file_name;
    const fileSize = body.file_size !== undefined ? body.file_size : current.file_size;
    const fileType = body.file_type !== undefined ? body.file_type : current.file_type;

    const result = await pool.query(
      `UPDATE documents SET
        title = $1, description = $2, category = $3, folder = $4, year = $5,
        file_url = $6, file_name = $7, file_size = $8, file_type = $9, updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [title, description, category, folder, year, fileUrl, fileName, fileSize, fileType, Number(id)]
    );

    res.json(toDocumentDto(result.rows[0]));
  } catch (error: any) {
    console.error('Update Document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM documents WHERE id = $1 RETURNING id', [Number(id)]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Document not found' });
    res.json({ message: 'Documento removido' });
  } catch (error: any) {
    console.error('Delete Document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const uploadDocumentFile = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum ficheiro enviado' });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
};

export const listDownloads = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT dd.id, dd.document_id, dd.downloaded_at,
             d.id as doc_id, d.title as doc_title, d.category as doc_category, d.folder as doc_folder
      FROM document_downloads dd
      LEFT JOIN documents d ON dd.document_id = d.id
      ORDER BY dd.downloaded_at DESC
    `);
    res.json(result.rows.map((d) => ({
      id: d.id,
      document_id: d.document_id,
      downloaded_at: d.downloaded_at,
      document: d.doc_id ? { id: d.doc_id, title: d.doc_title, category: d.doc_category, folder: d.doc_folder } : null,
    })));
  } catch (error) {
    console.error('List Downloads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Public ---

export const listPublicDocuments = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM documents ORDER BY year DESC NULLS LAST, created_at DESC');
    res.json(result.rows.map(toDocumentDto));
  } catch (error) {
    console.error('List Public Documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const trackDownload = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_agent } = req.body as { user_agent?: string };
    await pool.query(
      `INSERT INTO document_downloads (document_id, user_agent, ip_address)
       VALUES ($1, $2, $3)`,
      [Number(id), user_agent || req.headers['user-agent'] || null, req.ip || null]
    );
    res.status(201).json({ message: 'Download registado' });
  } catch (error) {
    console.error('Track Download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
