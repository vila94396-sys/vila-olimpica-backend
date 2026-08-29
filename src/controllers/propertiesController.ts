import { Request, Response } from 'express';
import { pool } from '../lib/db';

const parseJsonArray = (raw: string | null): string[] | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const toPropertyDto = (p: any) => ({
  id: p.id,
  title: p.title,
  description: p.description,
  full_description: p.full_description,
  property_type: p.property_type,
  transaction_type: p.transaction_type,
  price: p.price,
  area: p.area,
  bedrooms: p.bedrooms,
  bathrooms: p.bathrooms,
  parking_spots: p.parking_spots,
  block: p.block,
  building: p.building,
  apartment_number: p.apartment_number,
  address: p.address,
  neighborhood: p.neighborhood,
  city: p.city,
  state: p.state,
  zip_code: p.zip_code,
  features: parseJsonArray(p.features),
  image_url: p.image_url,
  gallery_urls: parseJsonArray(p.gallery_urls),
  is_featured: p.is_featured,
  is_active: p.is_active,
  owner_name: p.owner_name,
  owner_whatsapp: p.owner_whatsapp,
  user_id: p.user_id,
  created_at: p.created_at,
});

interface PropertyInput {
  title?: string;
  description?: string | null;
  full_description?: string | null;
  property_type?: string;
  transaction_type?: string;
  price?: number | null;
  area?: number | null;
  bedrooms?: number;
  bathrooms?: number;
  parking_spots?: number;
  block?: string | null;
  building?: string | null;
  apartment_number?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  features?: string[] | null;
  image_url?: string | null;
  gallery_urls?: string[] | null;
  is_featured?: boolean;
  is_active?: boolean;
  owner_name?: string | null;
  owner_whatsapp?: string | null;
}

// --- Admin ---

export const listProperties = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM properties ORDER BY created_at DESC');
    res.json(result.rows.map(toPropertyDto));
  } catch (error) {
    console.error('List Properties error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProperty = async (req: Request, res: Response) => {
  try {
    const body = req.body as PropertyInput;
    if (!body.title?.trim()) {
      return res.status(400).json({ error: 'O título é obrigatório' });
    }

    const title = body.title.trim();
    const description = body.description || null;
    const fullDescription = body.full_description || null;
    const propertyType = body.property_type || 'apartment';
    const transactionType = body.transaction_type || 'sale';
    const price = body.price ?? null;
    const area = body.area ?? null;
    const bedrooms = body.bedrooms ?? 0;
    const bathrooms = body.bathrooms ?? 0;
    const parkingSpots = body.parking_spots ?? 0;
    const block = body.block || null;
    const building = body.building || null;
    const apartmentNumber = body.apartment_number || null;
    const address = body.address || null;
    const neighborhood = body.neighborhood || null;
    const city = body.city || null;
    const state = body.state || null;
    const zipCode = body.zip_code || null;
    const features = body.features ? JSON.stringify(body.features) : null;
    const imageUrl = body.image_url || null;
    const galleryUrls = body.gallery_urls ? JSON.stringify(body.gallery_urls) : null;
    const isFeatured = body.is_featured ?? false;
    const isActive = body.is_active ?? true;
    const ownerName = body.owner_name || null;
    const ownerWhatsapp = body.owner_whatsapp || null;
    const userId = req.user?.userId || null;

    const result = await pool.query(
      `INSERT INTO properties (
        title, description, full_description, property_type, transaction_type, price, area,
        bedrooms, bathrooms, parking_spots, block, building, apartment_number, address,
        neighborhood, city, state, zip_code, features, image_url, gallery_urls, is_featured,
        is_active, owner_name, owner_whatsapp, user_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      ) RETURNING *`,
      [
        title, description, fullDescription, propertyType, transactionType, price, area,
        bedrooms, bathrooms, parkingSpots, block, building, apartmentNumber, address,
        neighborhood, city, state, zipCode, features, imageUrl, galleryUrls, isFeatured,
        isActive, ownerName, ownerWhatsapp, userId
      ]
    );

    res.status(201).json(toPropertyDto(result.rows[0]));
  } catch (error) {
    console.error('Create Property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProperty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as PropertyInput;

    const currentResult = await pool.query('SELECT * FROM properties WHERE id = $1', [Number(id)]);
    if (currentResult.rows.length === 0) return res.status(404).json({ error: 'Property not found' });
    const current = currentResult.rows[0];

    const title = body.title !== undefined ? body.title : current.title;
    const description = body.description !== undefined ? body.description : current.description;
    const fullDescription = body.full_description !== undefined ? body.full_description : current.full_description;
    const propertyType = body.property_type !== undefined ? body.property_type : current.property_type;
    const transactionType = body.transaction_type !== undefined ? body.transaction_type : current.transaction_type;
    const price = body.price !== undefined ? body.price : current.price;
    const area = body.area !== undefined ? body.area : current.area;
    const bedrooms = body.bedrooms !== undefined ? body.bedrooms : current.bedrooms;
    const bathrooms = body.bathrooms !== undefined ? body.bathrooms : current.bathrooms;
    const parkingSpots = body.parking_spots !== undefined ? body.parking_spots : current.parking_spots;
    const block = body.block !== undefined ? body.block : current.block;
    const building = body.building !== undefined ? body.building : current.building;
    const apartmentNumber = body.apartment_number !== undefined ? body.apartment_number : current.apartment_number;
    const address = body.address !== undefined ? body.address : current.address;
    const neighborhood = body.neighborhood !== undefined ? body.neighborhood : current.neighborhood;
    const city = body.city !== undefined ? body.city : current.city;
    const state = body.state !== undefined ? body.state : current.state;
    const zipCode = body.zip_code !== undefined ? body.zip_code : current.zip_code;
    const features = body.features !== undefined ? (body.features ? JSON.stringify(body.features) : null) : current.features;
    const imageUrl = body.image_url !== undefined ? body.image_url : current.image_url;
    const galleryUrls = body.gallery_urls !== undefined ? (body.gallery_urls ? JSON.stringify(body.gallery_urls) : null) : current.gallery_urls;
    const isFeatured = body.is_featured !== undefined ? body.is_featured : current.is_featured;
    const isActive = body.is_active !== undefined ? body.is_active : current.is_active;
    const ownerName = body.owner_name !== undefined ? body.owner_name : current.owner_name;
    const ownerWhatsapp = body.owner_whatsapp !== undefined ? body.owner_whatsapp : current.owner_whatsapp;

    const result = await pool.query(
      `UPDATE properties SET
        title = $1, description = $2, full_description = $3, property_type = $4, transaction_type = $5,
        price = $6, area = $7, bedrooms = $8, bathrooms = $9, parking_spots = $10, block = $11,
        building = $12, apartment_number = $13, address = $14, neighborhood = $15, city = $16,
        state = $17, zip_code = $18, features = $19, image_url = $20, gallery_urls = $21,
        is_featured = $22, is_active = $23, owner_name = $24, owner_whatsapp = $25, updated_at = NOW()
       WHERE id = $26 RETURNING *`,
      [
        title, description, fullDescription, propertyType, transactionType,
        price, area, bedrooms, bathrooms, parkingSpots, block,
        building, apartmentNumber, address, neighborhood, city,
        state, zipCode, features, imageUrl, galleryUrls,
        isFeatured, isActive, ownerName, ownerWhatsapp, Number(id)
      ]
    );

    res.json(toPropertyDto(result.rows[0]));
  } catch (error: any) {
    console.error('Update Property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProperty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM properties WHERE id = $1 RETURNING id', [Number(id)]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Property not found' });
    res.json({ message: 'Property removed' });
  } catch (error: any) {
    console.error('Delete Property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const uploadPropertyImage = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum ficheiro enviado' });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
};

// --- Public ---

export const listPublicProperties = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM properties WHERE is_active = true ORDER BY is_featured DESC, created_at DESC');
    res.json(result.rows.map(toPropertyDto));
  } catch (error) {
    console.error('List Public Properties error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPublicProperty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM properties WHERE id = $1 AND is_active = true', [Number(id)]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Property not found' });
    res.json(toPropertyDto(result.rows[0]));
  } catch (error) {
    console.error('Get Public Property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
