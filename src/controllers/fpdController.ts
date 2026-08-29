import { Request, Response } from 'express';
import { pool } from '../lib/db';
import { FeeStatus, MESES_LABELS, calcFeeStatus, getDividaHistorica } from '../lib/fees';

const toUnidadeDto = (u: any) => ({
  id: u.id,
  ord: u.ord,
  apartamento: u.apartamento,
  nome: u.nome,
  contacto: u.contacto,
  taxa: u.taxa,
  divida_anterior: u.divida_anterior,
  pagamentos_historicos: u.pagamentos_historicos,
  user_id: u.user_id,
  created_at: u.created_at,
});

const toFeeDto = (f: any) => ({
  id: f.id,
  unidade_id: f.unidade_id,
  reference_month: f.reference_month,
  reference_year: f.reference_year,
  amount: f.amount,
  valor_pago: f.valor_pago,
  due_date: f.due_date,
  status: (f.status || '').toLowerCase(),
  paid_at: f.paid_at,
  payment_method: f.payment_method,
  receipt_url: f.receipt_url,
  created_at: f.created_at,
});

// --- Unidades ---

export const listUnidades = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM fpd_unidades ORDER BY ord ASC');
    res.json(result.rows.map(toUnidadeDto));
  } catch (error) {
    console.error('List Fpd Unidades error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUnidade = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, apartamento, contacto, divida_acumulada } = req.body;

    const currentResult = await pool.query('SELECT * FROM fpd_unidades WHERE id = $1', [Number(id)]);
    if (currentResult.rows.length === 0) return res.status(404).json({ error: 'Unidade not found' });
    const current = currentResult.rows[0];

    const newNome = nome !== undefined ? nome : current.nome;
    const newApartamento = apartamento !== undefined ? Number(apartamento) || 1 : current.apartamento;
    const newContacto = contacto !== undefined ? contacto : current.contacto;

    let newDividaAnterior = current.divida_anterior;
    let newPagamentosHistoricos = current.pagamentos_historicos;
    if (divida_acumulada !== undefined) {
      newDividaAnterior = Math.max(0, Number(divida_acumulada) || 0);
      newPagamentosHistoricos = 0;
    }

    const result = await pool.query(
      `UPDATE fpd_unidades SET
        nome = $1, apartamento = $2, contacto = $3, divida_anterior = $4, pagamentos_historicos = $5, updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [newNome, newApartamento, newContacto, newDividaAnterior, newPagamentosHistoricos, Number(id)]
    );

    res.json(toUnidadeDto(result.rows[0]));
  } catch (error: any) {
    console.error('Update Fpd Unidade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Fees ---

export const listFeesByYear = async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year);
    if (!year) return res.status(400).json({ error: 'year query param is required' });
    const result = await pool.query('SELECT * FROM fpd_fees WHERE reference_year = $1', [year]);
    res.json(result.rows.map(toFeeDto));
  } catch (error) {
    console.error('List Fpd Fees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listAvailableYears = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT DISTINCT reference_year FROM fpd_fees ORDER BY reference_year DESC');
    const years = new Set(result.rows.map((r) => r.reference_year));
    years.add(new Date().getFullYear());
    res.json([...years].sort((a, b) => b - a));
  } catch (error) {
    console.error('List Fpd Available Years error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const generateFees = async (req: Request, res: Response) => {
  try {
    const { year, amount, unidadeIds } = req.body as {
      year: number; amount: number; unidadeIds: number[];
    };
    if (!year || !amount || !Array.isArray(unidadeIds) || unidadeIds.length === 0) {
      return res.status(400).json({ error: 'year, amount and unidadeIds are required' });
    }

    const meses = Array.from({ length: 12 }, (_, i) => i + 1);
    let created = 0;
    let skipped = 0;

    for (const mes of meses) {
      for (const unidadeId of unidadeIds) {
        const dueDate = new Date(year, mes - 1, 15);
        const insertRes = await pool.query(
          `INSERT INTO fpd_fees (unidade_id, reference_month, reference_year, amount, valor_pago, due_date, status)
           VALUES ($1, $2, $3, $4, 0, $5, 'PENDING')
           ON CONFLICT (unidade_id, reference_year, reference_month) DO NOTHING
           RETURNING id`,
          [unidadeId, mes, year, amount, dueDate]
        );
        if (insertRes.rows.length > 0) created++;
        else skipped++;
      }
    }

    res.json({ created, skipped });
  } catch (error) {
    console.error('Generate Fpd Fees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const payFee = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { amount, paymentMethod } = req.body as { amount: number; paymentMethod: string };
    if (!amount || amount <= 0 || !paymentMethod) {
      return res.status(400).json({ error: 'amount and paymentMethod are required' });
    }

    const feeResult = await client.query('SELECT * FROM fpd_fees WHERE id = $1', [Number(id)]);
    if (feeResult.rows.length === 0) return res.status(404).json({ error: 'Fee not found' });
    const fee = feeResult.rows[0];

    const novoValorPago = fee.valor_pago + amount;
    const novoStatus = calcFeeStatus(fee.amount, novoValorPago);

    await client.query('BEGIN');

    const updateRes = await client.query(
      `UPDATE fpd_fees
       SET valor_pago = $1, status = $2, paid_at = $3, payment_method = $4, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [novoValorPago, novoStatus, novoStatus === FeeStatus.PAID ? new Date() : null, paymentMethod, fee.id]
    );

    await client.query(
      `INSERT INTO fpd_fee_payments (fee_id, amount, payment_method, created_by_user_id)
       VALUES ($1, $2, $3, $4)`,
      [fee.id, amount, paymentMethod, req.user?.userId || null]
    );

    await client.query('COMMIT');

    res.json(toFeeDto(updateRes.rows[0]));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Pay Fpd Fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const updateFeeStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: keyof typeof FeeStatus };
    if (!status || !(status in FeeStatus)) {
      return res.status(400).json({ error: 'status inválido' });
    }

    const result = await pool.query(
      `UPDATE fpd_fees SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [FeeStatus[status], Number(id)]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Fee not found' });
    res.json(toFeeDto(result.rows[0]));
  } catch (error) {
    console.error('Update Fpd Fee Status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const cascadePayment = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { ano, mesesSelecionados, valor, paymentMethod } = req.body as {
      ano: number; mesesSelecionados: number[]; valor: number; paymentMethod: string;
    };

    if (!ano || !valor || valor <= 0 || !paymentMethod) {
      return res.status(400).json({ error: 'ano, valor and paymentMethod are required' });
    }

    const unidadeRes = await client.query('SELECT * FROM fpd_unidades WHERE id = $1', [Number(id)]);
    if (unidadeRes.rows.length === 0) return res.status(404).json({ error: 'Unidade not found' });
    const unidade = unidadeRes.rows[0];

    const feesRes = await client.query(
      'SELECT * FROM fpd_fees WHERE unidade_id = $1 AND reference_year = $2',
      [unidade.id, ano]
    );
    const feesDoAno = feesRes.rows;
    const feeByMonth = new Map(feesDoAno.map((f) => [f.reference_month, f]));

    let restante = valor;
    const allocations: Array<{ period: string; amount: number }> = [];

    const dividaAcumulada = getDividaHistorica({
      dividaAnterior: unidade.divida_anterior,
      pagamentosHistoricos: unidade.pagamentos_historicos,
    });
    let novosPagHist = unidade.pagamentos_historicos;
    if (dividaAcumulada > 0 && restante > 0) {
      const aplicar = Math.min(restante, dividaAcumulada);
      novosPagHist += aplicar;
      restante -= aplicar;
      allocations.push({ period: 'Dívida acumulada', amount: aplicar });
    }

    const mesesOrdenados = [...(mesesSelecionados || [])].sort((a, b) => a - b);
    const paidMonths: string[] = [];
    const feeUpserts: Array<{ mes: number; existing?: any; novoValorPago: number; novoStatus: FeeStatus }> = [];

    for (const mes of mesesOrdenados) {
      if (restante <= 0) break;
      const existing = feeByMonth.get(mes);
      const valorDevido = existing?.amount ?? unidade.taxa;
      const jaPago = existing?.valor_pago ?? 0;
      const divida = Math.max(0, valorDevido - jaPago);
      if (divida <= 0) continue;
      const aplicar = Math.min(restante, divida);
      const novoValorPago = jaPago + aplicar;
      const novoStatus = calcFeeStatus(valorDevido, novoValorPago);
      feeUpserts.push({ mes, existing, novoValorPago, novoStatus });
      allocations.push({ period: `${MESES_LABELS[mes]}/${ano}`, amount: aplicar });
      paidMonths.push(`${MESES_LABELS[mes]}/${ano}`);
      restante -= aplicar;
    }

    const saldoRemanescente = restante;
    if (saldoRemanescente > 0) {
      allocations.push({ period: 'Crédito (próximo mês)', amount: saldoRemanescente });
    }

    await client.query('BEGIN');

    for (const u of feeUpserts) {
      let feeId: number;
      if (u.existing) {
        feeId = u.existing.id;
        await client.query(
          `UPDATE fpd_fees
           SET valor_pago = $1, status = $2, paid_at = $3, payment_method = $4, updated_at = NOW()
           WHERE id = $5`,
          [u.novoValorPago, u.novoStatus, u.novoStatus === FeeStatus.PAID ? new Date() : null, paymentMethod, u.existing.id]
        );
      } else {
        const dueDate = new Date(ano, u.mes - 1, 15);
        const createdRes = await client.query(
          `INSERT INTO fpd_fees (unidade_id, reference_month, reference_year, amount, valor_pago, status, paid_at, payment_method, due_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [unidade.id, u.mes, ano, unidade.taxa, u.novoValorPago, u.novoStatus, u.novoStatus === FeeStatus.PAID ? new Date() : null, paymentMethod, dueDate]
        );
        feeId = createdRes.rows[0].id;
      }
      const aplicadoNesteMes = u.novoValorPago - (u.existing?.valor_pago ?? 0);
      await client.query(
        `INSERT INTO fpd_fee_payments (fee_id, amount, payment_method, created_by_user_id)
         VALUES ($1, $2, $3, $4)`,
        [feeId, aplicadoNesteMes, paymentMethod, req.user?.userId || null]
      );
    }

    if (novosPagHist !== unidade.pagamentos_historicos) {
      await client.query(
        'UPDATE fpd_unidades SET pagamentos_historicos = $1, updated_at = NOW() WHERE id = $2',
        [novosPagHist, unidade.id]
      );
    }

    await client.query('COMMIT');

    const feesAtualizadasRes = await pool.query(
      'SELECT * FROM fpd_fees WHERE unidade_id = $1 AND reference_year = $2',
      [unidade.id, ano]
    );
    const dividaHistRestante = Math.max(0, unidade.divida_anterior - novosPagHist);
    const dividaMensalRestante = feesAtualizadasRes.rows.reduce((s, f) => s + Math.max(0, f.amount - f.valor_pago), 0);

    res.json({
      allocations,
      paidMonths,
      totalPago: valor,
      saldoRemanescente: dividaHistRestante + dividaMensalRestante,
      unidade_id: unidade.id,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Cascade Payment (Fpd) error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};
