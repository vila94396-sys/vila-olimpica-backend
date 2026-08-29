import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import type { Document, DocumentDownload } from '@prisma/client';

const toDocumentDto = (d: Document) => ({
  id: d.id,
  title: d.title,
  description: d.description,
  category: d.category,
  folder: d.folder,
  year: d.year,
  file_url: d.fileUrl,
  file_name: d.fileName,
  file_size: d.fileSize,
  file_type: d.fileType,
  created_at: d.createdAt,
  updated_at: d.updatedAt,
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

const toPrismaData = (body: DocumentInput) => ({
  ...(body.title !== undefined && { title: body.title }),
  ...(body.description !== undefined && { description: body.description }),
  ...(body.category !== undefined && { category: body.category }),
  ...(body.folder !== undefined && { folder: body.folder }),
  ...(body.year !== undefined && { year: body.year }),
  ...(body.file_url !== undefined && { fileUrl: body.file_url }),
  ...(body.file_name !== undefined && { fileName: body.file_name }),
  ...(body.file_size !== undefined && { fileSize: body.file_size }),
  ...(body.file_type !== undefined && { fileType: body.file_type }),
});

// --- Admin ---

export const listDocuments = async (req: Request, res: Response) => {
  try {
    const documents = await prisma.document.findMany({
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(documents.map(toDocumentDto));
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
    const document = await prisma.document.create({
      data: { title: body.title.trim(), category: body.category, fileUrl: body.file_url, fileName: body.file_name, ...toPrismaData(body) },
    });
    res.status(201).json(toDocumentDto(document));
  } catch (error) {
    console.error('Create Document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.update({
      where: { id: Number(id) },
      data: toPrismaData(req.body as DocumentInput),
    });
    res.json(toDocumentDto(document));
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Document not found' });
    console.error('Update Document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.document.delete({ where: { id: Number(id) } });
    res.json({ message: 'Documento removido' });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Document not found' });
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

type DownloadWithDocument = DocumentDownload & { document: Document | null };

export const listDownloads = async (req: Request, res: Response) => {
  try {
    const downloads = await prisma.documentDownload.findMany({
      include: { document: true },
      orderBy: { downloadedAt: 'desc' },
    });
    res.json((downloads as DownloadWithDocument[]).map((d) => ({
      id: d.id,
      document_id: d.documentId,
      downloaded_at: d.downloadedAt,
      document: d.document ? { id: d.document.id, title: d.document.title, category: d.document.category, folder: d.document.folder } : null,
    })));
  } catch (error) {
    console.error('List Downloads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Public ---

export const listPublicDocuments = async (req: Request, res: Response) => {
  try {
    const documents = await prisma.document.findMany({
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(documents.map(toDocumentDto));
  } catch (error) {
    console.error('List Public Documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const trackDownload = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { user_agent } = req.body as { user_agent?: string };
    await prisma.documentDownload.create({
      data: {
        documentId: Number(id),
        userAgent: user_agent || req.headers['user-agent'] || null,
        ipAddress: req.ip || null,
      },
    });
    res.status(201).json({ message: 'Download registado' });
  } catch (error) {
    console.error('Track Download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
