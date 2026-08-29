import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { InstitutionFeeStatus, InstitutionFee, InstitutionPayment } from '@prisma/client';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const toFeeDto = (f: InstitutionFee) => ({
  id: f.id,
  institution: f.institution,
  reference_year: f.referenceYear,
  reference_month: f.referenceMonth,
  period_label: f.periodLabel,
  descricao: f.descricao,
  taxa: f.taxa,
  n_apartamentos: f.nApartamentos,
  valor: f.valor,
  valor_pago: f.valorPago,
  status: f.status.toLowerCase(),
  paid_at: f.paidAt,
  payment_method: f.paymentMethod,
});

const toPaymentDto = (p: InstitutionPayment) => ({
  id: p.id,
  fee_id: p.feeId,
  institution: p.institution,
  amount: p.amount,
  payment_method: p.paymentMethod,
  payment_date: p.paymentDate,
  reference: p.reference,
  notes: p.notes,
  created_at: p.createdAt,
});

const calcStatus = (valor: number, valorPago: number): InstitutionFeeStatus => {
  if (valorPago >= valor - 0.01 && valor > 0) return InstitutionFeeStatus.PAID;
  if (valorPago > 0) return InstitutionFeeStatus.PARTIAL;
  return InstitutionFeeStatus.PENDING;
};

export const listFees = async (req: Request, res: Response) => {
  try {
    const institution = String(req.params.institution);
    const fees = await prisma.institutionFee.findMany({
      where: { institution },
      orderBy: [{ referenceYear: 'asc' }, { referenceMonth: 'asc' }],
    });
    res.json(fees.map(toFeeDto));
  } catch (error) {
    console.error('List Institution Fees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createFee = async (req: Request, res: Response) => {
  try {
    const institution = String(req.params.institution);
    const { reference_year, reference_month, descricao, taxa, n_apartamentos } = req.body as {
      reference_year: number; reference_month: number; descricao?: string; taxa: number; n_apartamentos: number;
    };
    if (!reference_year || !reference_month || taxa == null || taxa < 0 || n_apartamentos == null || n_apartamentos < 0) {
      return res.status(400).json({ error: 'Valores inválidos' });
    }
    const valor = taxa * n_apartamentos;
    const fee = await prisma.institutionFee.create({
      data: {
        institution,
        referenceYear: reference_year,
        referenceMonth: reference_month,
        periodLabel: `${MESES[reference_month - 1]}/${reference_year}`,
        descricao: descricao || 'Taxa de condomínio',
        taxa,
        nApartamentos: n_apartamentos,
        valor,
        valorPago: 0,
        status: InstitutionFeeStatus.PENDING,
      },
    });
    res.status(201).json(toFeeDto(fee));
  } catch (error) {
    console.error('Create Institution Fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateFee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reference_year, reference_month, descricao, taxa, n_apartamentos, valor_pago } = req.body as {
      reference_year: number; reference_month: number; descricao: string; taxa: number; n_apartamentos: number; valor_pago: number;
    };
    if (!reference_year || !reference_month || taxa < 0 || n_apartamentos < 0 || valor_pago < 0) {
      return res.status(400).json({ error: 'Valores inválidos' });
    }
    const valor = taxa * n_apartamentos;
    const fee = await prisma.institutionFee.update({
      where: { id: Number(id) },
      data: {
        referenceYear: reference_year,
        referenceMonth: reference_month,
        periodLabel: `${MESES[reference_month - 1]}/${reference_year}`,
        descricao,
        taxa,
        nApartamentos: n_apartamentos,
        valor,
        valorPago: valor_pago,
        status: calcStatus(valor, valor_pago),
      },
    });
    res.json(toFeeDto(fee));
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Fee not found' });
    console.error('Update Institution Fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteFee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.institutionFee.delete({ where: { id: Number(id) } });
    res.json({ message: 'Registo e pagamentos associados removidos' });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Fee not found' });
    console.error('Delete Institution Fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listPayments = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payments = await prisma.institutionPayment.findMany({
      where: { feeId: Number(id) },
      orderBy: { paymentDate: 'desc' },
    });
    res.json(payments.map(toPaymentDto));
  } catch (error) {
    console.error('List Institution Payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const payMulti = async (req: Request, res: Response) => {
  try {
    const { feeIds, amount, paymentMethod, paymentDate, reference, notes } = req.body as {
      feeIds: number[]; amount: number; paymentMethod: string; paymentDate?: string; reference?: string; notes?: string;
    };
    if (!Array.isArray(feeIds) || feeIds.length === 0 || !amount || amount <= 0 || !paymentMethod) {
      return res.status(400).json({ error: 'feeIds, amount and paymentMethod are required' });
    }

    const fees = await prisma.institutionFee.findMany({ where: { id: { in: feeIds.map(Number) } } });
    const ordered = [...fees].sort((a, b) => a.referenceYear - b.referenceYear || a.referenceMonth - b.referenceMonth);

    let restante = amount;
    const allocations: Array<{ period: string; amount: number }> = [];
    const updates: Array<{ fee: InstitutionFee; novoPago: number; novoStatus: InstitutionFeeStatus }> = [];

    for (const fee of ordered) {
      if (restante <= 0) break;
      const saldo = Math.max(0, fee.valor - fee.valorPago);
      if (saldo <= 0) continue;
      const aplicar = Math.min(restante, saldo);
      const novoPago = fee.valorPago + aplicar;
      const novoStatus = calcStatus(fee.valor, novoPago);
      updates.push({ fee, novoPago, novoStatus });
      allocations.push({ period: fee.periodLabel, amount: aplicar });
      restante -= aplicar;
    }

    const pDate = paymentDate ? new Date(paymentDate) : new Date();

    await prisma.$transaction(async (tx) => {
      for (const u of updates) {
        await tx.institutionFee.update({
          where: { id: u.fee.id },
          data: {
            valorPago: u.novoPago,
            status: u.novoStatus,
            paidAt: u.novoStatus === InstitutionFeeStatus.PAID ? new Date() : u.fee.paidAt,
            paymentMethod,
          },
        });
        await tx.institutionPayment.create({
          data: {
            feeId: u.fee.id,
            institution: u.fee.institution,
            amount: u.novoPago - u.fee.valorPago,
            paymentMethod,
            paymentDate: pDate,
            reference: reference || null,
            notes: notes || null,
            createdByUserId: req.user?.userId,
          },
        });
      }
    });

    res.json({
      allocations,
      totalPago: amount,
      saldoRemanescente: Math.max(0, restante),
      paidFeeIds: updates.map((u) => u.fee.id),
    });
  } catch (error) {
    console.error('Institution Pay Multi error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const [fees, recentPayments] = await Promise.all([
      prisma.institutionFee.findMany({ select: { institution: true, valor: true, valorPago: true } }),
      prisma.institutionPayment.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    let valor = 0, pago = 0;
    const byInstitution: Record<string, { valor: number; pago: number }> = {};
    for (const f of fees) {
      valor += f.valor;
      pago += f.valorPago;
      const entry = byInstitution[f.institution] ?? (byInstitution[f.institution] = { valor: 0, pago: 0 });
      entry.valor += f.valor;
      entry.pago += f.valorPago;
    }

    res.json({
      totals: { valor, pago, saldo: Math.max(0, valor - pago) },
      byInstitution,
      recent: recentPayments.map(toPaymentDto),
    });
  } catch (error) {
    console.error('Institution Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
