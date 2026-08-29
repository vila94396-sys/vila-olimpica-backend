import { Request, Response } from 'express';
import { pool } from '../lib/db';

export enum InstitutionFeeStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const toFeeDto = (f: any) => ({
  id: f.id,
  institution: f.institution,
  reference_year: f.reference_year,
  reference_month: f.reference_month,
  period_label: f.period_label,
  descricao: f.descricao,
  taxa: f.taxa,
  n_apartamentos: f.n_apartamentos,
  valor: f.valor,
  valor_pago: f.valor_pago,
  status: (f.status || '').toLowerCase(),
  paid_at: f.paid_at,
  payment_method: f.payment_method,
});

const toPaymentDto = (p: any) => ({
  id: p.id,
  fee_id: p.fee_id,
  institution: p.institution,
  amount: p.amount,
  payment_method: p.payment_method,
  payment_date: p.payment_date,
  reference: p.reference,
  notes: p.notes,
  created_at: p.created_at,
});

const calcStatus = (valor: number, valorPago: number): InstitutionFeeStatus => {
  if (valorPago >= valor - 0.01 && valor > 0) return InstitutionFeeStatus.PAID;
  if (valorPago > 0) return InstitutionFeeStatus.PARTIAL;
  return InstitutionFeeStatus.PENDING;
};

export const listFees = async (req: Request, res: Response) => {
  try {
    const institution = String(req.params.institution);
    const result = await pool.query(
      'SELECT * FROM institution_fees WHERE institution = $1 ORDER BY reference_year ASC, reference_month ASC',
      [institution]
    );
    res.json(result.rows.map(toFeeDto));
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
    const periodLabel = `${MESES[reference_month - 1]}/${reference_year}`;

    const result = await pool.query(
      `INSERT INTO institution_fees (institution, reference_year, reference_month, period_label, descricao, taxa, n_apartamentos, valor, valor_pago, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 'PENDING')
       RETURNING *`,
      [institution, reference_year, reference_month, periodLabel, descricao || 'Taxa de condomínio', taxa, n_apartamentos, valor]
    );

    res.status(201).json(toFeeDto(result.rows[0]));
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
    const periodLabel = `${MESES[reference_month - 1]}/${reference_year}`;
    const status = calcStatus(valor, valor_pago);

    const result = await pool.query(
      `UPDATE institution_fees SET
        reference_year = $1, reference_month = $2, period_label = $3, descricao = $4,
        taxa = $5, n_apartamentos = $6, valor = $7, valor_pago = $8, status = $9, updated_at = NOW()
       WHERE id = $10 RETURNING *`,
      [reference_year, reference_month, periodLabel, descricao, taxa, n_apartamentos, valor, valor_pago, status, Number(id)]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Fee not found' });
    res.json(toFeeDto(result.rows[0]));
  } catch (error: any) {
    console.error('Update Institution Fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteFee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM institution_fees WHERE id = $1 RETURNING id', [Number(id)]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Fee not found' });
    res.json({ message: 'Registo e pagamentos associados removidos' });
  } catch (error: any) {
    console.error('Delete Institution Fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listPayments = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM institution_payments WHERE fee_id = $1 ORDER BY payment_date DESC',
      [Number(id)]
    );
    res.json(result.rows.map(toPaymentDto));
  } catch (error) {
    console.error('List Institution Payments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const payMulti = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { feeIds, amount, paymentMethod, paymentDate, reference, notes } = req.body as {
      feeIds: number[]; amount: number; paymentMethod: string; paymentDate?: string; reference?: string; notes?: string;
    };
    if (!Array.isArray(feeIds) || feeIds.length === 0 || !amount || amount <= 0 || !paymentMethod) {
      return res.status(400).json({ error: 'feeIds, amount and paymentMethod are required' });
    }

    const feesResult = await client.query('SELECT * FROM institution_fees WHERE id = ANY($1::int[])', [feeIds.map(Number)]);
    const fees = feesResult.rows;
    const ordered = [...fees].sort((a, b) => a.reference_year - b.reference_year || a.reference_month - b.reference_month);

    let restante = amount;
    const allocations: Array<{ period: string; amount: number }> = [];
    const updates: Array<{ fee: any; novoPago: number; novoStatus: InstitutionFeeStatus }> = [];

    for (const fee of ordered) {
      if (restante <= 0) break;
      const saldo = Math.max(0, fee.valor - fee.valor_pago);
      if (saldo <= 0) continue;
      const aplicar = Math.min(restante, saldo);
      const novoPago = fee.valor_pago + aplicar;
      const novoStatus = calcStatus(fee.valor, novoPago);
      updates.push({ fee, novoPago, novoStatus });
      allocations.push({ period: fee.period_label, amount: aplicar });
      restante -= aplicar;
    }

    const pDate = paymentDate ? new Date(paymentDate) : new Date();

    await client.query('BEGIN');

    for (const u of updates) {
      await client.query(
        `UPDATE institution_fees
         SET valor_pago = $1, status = $2, paid_at = $3, payment_method = $4, updated_at = NOW()
         WHERE id = $5`,
        [
          u.novoPago,
          u.novoStatus,
          u.novoStatus === InstitutionFeeStatus.PAID ? new Date() : u.fee.paid_at,
          paymentMethod,
          u.fee.id,
        ]
      );

      await client.query(
        `INSERT INTO institution_payments (fee_id, institution, amount, payment_method, payment_date, reference, notes, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          u.fee.id,
          u.fee.institution,
          u.novoPago - u.fee.valor_pago,
          paymentMethod,
          pDate,
          reference || null,
          notes || null,
          req.user?.userId || null,
        ]
      );
    }

    await client.query('COMMIT');

    res.json({
      allocations,
      totalPago: amount,
      saldoRemanescente: Math.max(0, restante),
      paidFeeIds: updates.map((u) => u.fee.id),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Institution Pay Multi error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const feesResult = await pool.query('SELECT institution, valor, valor_pago FROM institution_fees');
    const recentPaymentsResult = await pool.query('SELECT * FROM institution_payments ORDER BY created_at DESC LIMIT 10');

    let valor = 0, pago = 0;
    const byInstitution: Record<string, { valor: number; pago: number }> = {};
    for (const f of feesResult.rows) {
      valor += Number(f.valor) || 0;
      pago += Number(f.valor_pago) || 0;
      const entry = byInstitution[f.institution] ?? (byInstitution[f.institution] = { valor: 0, pago: 0 });
      entry.valor += Number(f.valor) || 0;
      entry.pago += Number(f.valor_pago) || 0;
    }

    res.json({
      totals: { valor, pago, saldo: Math.max(0, valor - pago) },
      byInstitution,
      recent: recentPaymentsResult.rows.map(toPaymentDto),
    });
  } catch (error) {
    console.error('Institution Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
