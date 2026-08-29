import { Request, Response } from 'express';
import { pool } from '../lib/db';
import fs from 'fs';

const toMarketplaceDto = (m: any) => ({
  id: String(m.id),
  user_id: m.user_id ? String(m.user_id) : null,
  owner_name: m.owner_name,
  business_name: m.business_name,
  category: m.category,
  phone: m.phone,
  email: m.email || '',
  location: m.location,
  description: m.description,
  full_description: m.full_description,
  hours: m.hours,
  image_url: m.image_url,
  status: m.status,
  created_at: m.created_at,
});

export const listApprovedServices = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT * FROM marketplace_services
      WHERE status = 'approved'
      ORDER BY created_at DESC
    `);
    res.json(result.rows.map(toMarketplaceDto));
  } catch (error) {
    console.error('List Approved Marketplace Services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listAllServices = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT * FROM marketplace_services
      ORDER BY created_at DESC
    `);
    res.json(result.rows.map(toMarketplaceDto));
  } catch (error) {
    console.error('List All Marketplace Services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listMyServices = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await pool.query(`
      SELECT * FROM marketplace_services
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);
    res.json(result.rows.map(toMarketplaceDto));
  } catch (error) {
    console.error('List My Marketplace Services error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createService = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId || null;
    const {
      owner_name,
      business_name,
      category,
      phone,
      email,
      location,
      description,
      full_description,
      hours,
      image_url,
    } = req.body;

    if (!owner_name?.trim() || !business_name?.trim() || !category?.trim() || !phone?.trim() || !description?.trim()) {
      return res.status(400).json({ error: 'Nome, negócio, categoria, telefone e descrição são obrigatórios' });
    }

    const result = await pool.query(`
      INSERT INTO marketplace_services (
        user_id, owner_name, business_name, category, phone, email,
        location, description, full_description, hours, image_url, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
      RETURNING *
    `, [
      userId,
      owner_name.trim(),
      business_name.trim(),
      category.trim(),
      phone.trim(),
      email?.trim() || null,
      location?.trim() || null,
      description.trim(),
      full_description?.trim() || null,
      hours?.trim() || null,
      image_url || null,
    ]);

    res.status(201).json(toMarketplaceDto(result.rows[0]));
  } catch (error) {
    console.error('Create Marketplace Service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    const currentResult = await pool.query('SELECT * FROM marketplace_services WHERE id = $1', [Number(id)]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    const current = currentResult.rows[0];
    if (!isAdmin && current.user_id !== userId) {
      return res.status(403).json({ error: 'Sem permissão para alterar este serviço' });
    }

    const body = req.body;
    const owner_name = body.owner_name !== undefined ? body.owner_name : current.owner_name;
    const business_name = body.business_name !== undefined ? body.business_name : current.business_name;
    const category = body.category !== undefined ? body.category : current.category;
    const phone = body.phone !== undefined ? body.phone : current.phone;
    const email = body.email !== undefined ? body.email : current.email;
    const location = body.location !== undefined ? body.location : current.location;
    const description = body.description !== undefined ? body.description : current.description;
    const full_description = body.full_description !== undefined ? body.full_description : current.full_description;
    const hours = body.hours !== undefined ? body.hours : current.hours;
    const image_url = body.image_url !== undefined ? body.image_url : current.image_url;

    const result = await pool.query(`
      UPDATE marketplace_services SET
        owner_name = $1, business_name = $2, category = $3, phone = $4,
        email = $5, location = $6, description = $7, full_description = $8,
        hours = $9, image_url = $10, updated_at = NOW()
      WHERE id = $11
      RETURNING *
    `, [
      owner_name, business_name, category, phone,
      email, location, description, full_description,
      hours, image_url, Number(id)
    ]);

    res.json(toMarketplaceDto(result.rows[0]));
  } catch (error) {
    console.error('Update Marketplace Service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateServiceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: string };

    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }

    const result = await pool.query(`
      UPDATE marketplace_services
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [status, Number(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado' });
    }

    res.json(toMarketplaceDto(result.rows[0]));
  } catch (error) {
    console.error('Update Marketplace Service Status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    let query = 'DELETE FROM marketplace_services WHERE id = $1';
    const params: any[] = [Number(id)];

    if (!isAdmin) {
      query += ' AND user_id = $2';
      params.push(userId);
    }
    query += ' RETURNING id';

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Serviço não encontrado ou sem permissão' });
    }

    res.json({ message: 'Serviço excluído com sucesso' });
  } catch (error) {
    console.error('Delete Marketplace Service error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const uploadMarketplaceImage = async (req: Request, res: Response) => {
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
    console.error('Upload marketplace image error:', err);
    res.status(500).json({ error: 'Erro ao processar imagem' });
  }
};
