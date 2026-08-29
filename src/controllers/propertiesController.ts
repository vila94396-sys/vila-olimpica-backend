import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import type { Property } from '@prisma/client';

const parseJsonArray = (raw: string | null): string[] | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const toPropertyDto = (p: Property) => ({
  id: p.id,
  title: p.title,
  description: p.description,
  full_description: p.fullDescription,
  property_type: p.propertyType,
  transaction_type: p.transactionType,
  price: p.price,
  area: p.area,
  bedrooms: p.bedrooms,
  bathrooms: p.bathrooms,
  parking_spots: p.parkingSpots,
  block: p.block,
  building: p.building,
  apartment_number: p.apartmentNumber,
  address: p.address,
  neighborhood: p.neighborhood,
  city: p.city,
  state: p.state,
  zip_code: p.zipCode,
  features: parseJsonArray(p.features),
  image_url: p.imageUrl,
  gallery_urls: parseJsonArray(p.galleryUrls),
  is_featured: p.isFeatured,
  is_active: p.isActive,
  owner_name: p.ownerName,
  owner_whatsapp: p.ownerWhatsapp,
  user_id: p.userId,
  created_at: p.createdAt,
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

const toPrismaData = (body: PropertyInput) => ({
  ...(body.title !== undefined && { title: body.title }),
  ...(body.description !== undefined && { description: body.description }),
  ...(body.full_description !== undefined && { fullDescription: body.full_description }),
  ...(body.property_type !== undefined && { propertyType: body.property_type }),
  ...(body.transaction_type !== undefined && { transactionType: body.transaction_type }),
  ...(body.price !== undefined && { price: body.price }),
  ...(body.area !== undefined && { area: body.area }),
  ...(body.bedrooms !== undefined && { bedrooms: body.bedrooms }),
  ...(body.bathrooms !== undefined && { bathrooms: body.bathrooms }),
  ...(body.parking_spots !== undefined && { parkingSpots: body.parking_spots }),
  ...(body.block !== undefined && { block: body.block }),
  ...(body.building !== undefined && { building: body.building }),
  ...(body.apartment_number !== undefined && { apartmentNumber: body.apartment_number }),
  ...(body.address !== undefined && { address: body.address }),
  ...(body.neighborhood !== undefined && { neighborhood: body.neighborhood }),
  ...(body.city !== undefined && { city: body.city }),
  ...(body.state !== undefined && { state: body.state }),
  ...(body.zip_code !== undefined && { zipCode: body.zip_code }),
  ...(body.features !== undefined && { features: body.features ? JSON.stringify(body.features) : null }),
  ...(body.image_url !== undefined && { imageUrl: body.image_url }),
  ...(body.gallery_urls !== undefined && { galleryUrls: body.gallery_urls ? JSON.stringify(body.gallery_urls) : null }),
  ...(body.is_featured !== undefined && { isFeatured: body.is_featured }),
  ...(body.is_active !== undefined && { isActive: body.is_active }),
  ...(body.owner_name !== undefined && { ownerName: body.owner_name }),
  ...(body.owner_whatsapp !== undefined && { ownerWhatsapp: body.owner_whatsapp }),
});

// --- Admin ---

export const listProperties = async (req: Request, res: Response) => {
  try {
    const properties = await prisma.property.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(properties.map(toPropertyDto));
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
    const property = await prisma.property.create({
      data: { title: body.title.trim(), userId: req.user?.userId, ...toPrismaData(body) },
    });
    res.status(201).json(toPropertyDto(property));
  } catch (error) {
    console.error('Create Property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProperty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as PropertyInput;
    const property = await prisma.property.update({
      where: { id: Number(id) },
      data: toPrismaData(body),
    });
    res.json(toPropertyDto(property));
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Property not found' });
    console.error('Update Property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProperty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.property.delete({ where: { id: Number(id) } });
    res.json({ message: 'Property removed' });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Property not found' });
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
    const properties = await prisma.property.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(properties.map(toPropertyDto));
  } catch (error) {
    console.error('List Public Properties error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPublicProperty = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const property = await prisma.property.findFirst({
      where: { id: Number(id), isActive: true },
    });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json(toPropertyDto(property));
  } catch (error) {
    console.error('Get Public Property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
