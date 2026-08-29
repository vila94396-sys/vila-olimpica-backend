import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { generateTempPassword } from '../lib/generatePassword';
import bcrypt from 'bcryptjs';

const toResidentDto = (u: {
  id: number;
  name: string | null;
  email: string;
  phone: string | null;
  block: string | null;
  building: string | null;
  apartment: string | null;
  residentType: string | null;
  status: string;
  isLocked: boolean;
  failedLoginCount: number;
  lockedAt: Date | null;
  createdAt: Date;
}) => ({
  id: u.id,
  full_name: u.name,
  email: u.email,
  phone: u.phone,
  block: u.block,
  building: u.building,
  apartment: u.apartment,
  resident_type: u.residentType,
  status: u.status === 'ACTIVE' ? 'approved' : u.status === 'BANNED' ? 'deactivated' : u.status.toLowerCase(),
  is_locked: u.isLocked,
  failed_login_count: u.failedLoginCount,
  locked_at: u.lockedAt,
  created_at: u.createdAt,
});

export const listResidents = async (req: Request, res: Response) => {
  try {
    const residents = await prisma.user.findMany({
      where: { role: 'RESIDENT' },
      orderBy: { name: 'asc' },
    });
    res.json(residents.map(toResidentDto));
  } catch (error) {
    console.error('List Residents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deactivateResident = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: { status: 'BANNED' },
    });
    res.json(toResidentDto(user));
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Resident not found' });
    console.error('Deactivate Resident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const reactivateResident = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: { status: 'ACTIVE' },
    });
    res.json(toResidentDto(user));
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Resident not found' });
    console.error('Reactivate Resident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteResident = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id: Number(id) } });
    res.json({ message: 'Resident removed' });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Resident not found' });
    console.error('Delete Resident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const unlockResident = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: {
        password: hashedPassword,
        isLocked: false,
        failedLoginCount: 0,
        lockedAt: null,
        mustChangePassword: true,
      },
    });

    res.json({
      email: user.email,
      password: tempPassword,
      full_name: user.name,
      whatsapp: user.phone,
    });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Resident not found' });
    console.error('Unlock Resident error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
