import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { FeeStatus, Unidade, CondominiumFee } from '@prisma/client';
import { MESES_LABELS, calcFeeStatus, getDividaHistorica } from '../lib/fees';

const toUnidadeDto = (u: Unidade) => ({
  id: u.id,
  ord: u.ord,
  bloco: u.bloco,
  edificio: u.edificio,
  apartamento: u.apartamento,
  nome: u.nome,
  contacto: u.contacto,
  via: u.via,
  categoria: u.categoria,
  divida_anterior: u.dividaAnterior,
  pagamentos_historicos: u.pagamentosHistoricos,
  user_id: u.userId,
  created_at: u.createdAt,
});

const toFeeDto = (f: CondominiumFee) => ({
  id: f.id,
  unidade_id: f.unidadeId,
  reference_month: f.referenceMonth,
  reference_year: f.referenceYear,
  amount: f.amount,
  valor_pago: f.valorPago,
  due_date: f.dueDate,
  status: f.status.toLowerCase(),
  paid_at: f.paidAt,
  payment_method: f.paymentMethod,
  receipt_url: f.receiptUrl,
  created_at: f.createdAt,
});

// --- Unidades ---

export const listUnidades = async (req: Request, res: Response) => {
  try {
    const unidades = await prisma.unidade.findMany({ orderBy: { ord: 'asc' } });
    res.json(unidades.map(toUnidadeDto));
  } catch (error) {
    console.error('List Unidades error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createUnidade = async (req: Request, res: Response) => {
  try {
    const { nome, bloco, edificio, apartamento, contacto, via, categoria } = req.body;
    if (!nome?.trim()) {
      return res.status(400).json({ error: 'O nome é obrigatório' });
    }
    const last = await prisma.unidade.findFirst({ orderBy: { ord: 'desc' } });
    const unidade = await prisma.unidade.create({
      data: {
        nome: nome.trim(),
        bloco: Number(bloco) || 1,
        edificio: Number(edificio) || 1,
        apartamento: Number(apartamento) || 1,
        contacto: contacto || '',
        via: via || '',
        categoria: categoria || 'quitadas',
        ord: (last?.ord ?? 0) + 1,
      },
    });
    res.status(201).json(toUnidadeDto(unidade));
  } catch (error) {
    console.error('Create Unidade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUnidade = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nome, bloco, edificio, apartamento, contacto, categoria, divida_acumulada } = req.body;

    const data: any = {};
    if (nome !== undefined) data.nome = nome;
    if (bloco !== undefined) data.bloco = Number(bloco) || 1;
    if (edificio !== undefined) data.edificio = Number(edificio) || 1;
    if (apartamento !== undefined) data.apartamento = Number(apartamento) || 1;
    if (contacto !== undefined) data.contacto = contacto;
    if (categoria !== undefined) data.categoria = categoria;
    if (divida_acumulada !== undefined) {
      data.dividaAnterior = Math.max(0, Number(divida_acumulada) || 0);
      data.pagamentosHistoricos = 0;
    }

    const unidade = await prisma.unidade.update({ where: { id: Number(id) }, data });
    res.json(toUnidadeDto(unidade));
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Unidade not found' });
    console.error('Update Unidade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteUnidade = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.unidade.delete({ where: { id: Number(id) } });
    res.json({ message: 'Unidade e taxas associadas removidas' });
  } catch (error: any) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Unidade not found' });
    console.error('Delete Unidade error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Fees ---

export const listFeesByYear = async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year);
    if (!year) return res.status(400).json({ error: 'year query param is required' });
    const fees = await prisma.condominiumFee.findMany({ where: { referenceYear: year } });
    res.json(fees.map(toFeeDto));
  } catch (error) {
    console.error('List Fees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listAvailableYears = async (req: Request, res: Response) => {
  try {
    const rows = await prisma.condominiumFee.findMany({
      distinct: ['referenceYear'],
      select: { referenceYear: true },
      orderBy: { referenceYear: 'desc' },
    });
    const years = new Set(rows.map((r) => r.referenceYear));
    years.add(new Date().getFullYear());
    res.json([...years].sort((a, b) => b - a));
  } catch (error) {
    console.error('List Available Years error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const generateFees = async (req: Request, res: Response) => {
  try {
    const { month, year, amount, unidadeIds } = req.body as {
      month: number | null; year: number; amount: number; unidadeIds: number[];
    };
    if (!year || !amount || !Array.isArray(unidadeIds) || unidadeIds.length === 0) {
      return res.status(400).json({ error: 'year, amount and unidadeIds are required' });
    }

    const meses = month ? [month] : Array.from({ length: 12 }, (_, i) => i + 1);
    const data = meses.flatMap((mes) =>
      unidadeIds.map((unidadeId) => ({
        unidadeId,
        referenceMonth: mes,
        referenceYear: year,
        amount,
        valorPago: 0,
        dueDate: new Date(year, mes - 1, 15),
        status: FeeStatus.PENDING,
      }))
    );

    const result = await prisma.condominiumFee.createMany({ data, skipDuplicates: true });
    res.json({ created: result.count, skipped: data.length - result.count });
  } catch (error) {
    console.error('Generate Fees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const payFee = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod } = req.body as { amount: number; paymentMethod: string };
    if (!amount || amount <= 0 || !paymentMethod) {
      return res.status(400).json({ error: 'amount and paymentMethod are required' });
    }

    const fee = await prisma.condominiumFee.findUnique({ where: { id: Number(id) } });
    if (!fee) return res.status(404).json({ error: 'Fee not found' });

    const novoValorPago = fee.valorPago + amount;
    const novoStatus = calcFeeStatus(fee.amount, novoValorPago);

    const [updated] = await prisma.$transaction([
      prisma.condominiumFee.update({
        where: { id: fee.id },
        data: {
          valorPago: novoValorPago,
          status: novoStatus,
          paidAt: novoStatus === FeeStatus.PAID ? new Date() : null,
          paymentMethod,
        },
      }),
      prisma.feePayment.create({
        data: { feeId: fee.id, amount, paymentMethod, createdByUserId: req.user?.userId },
      }),
    ]);

    res.json(toFeeDto(updated));
  } catch (error) {
    console.error('Pay Fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateFeeStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: keyof typeof FeeStatus };
    if (!status || !(status in FeeStatus)) {
      return res.status(400).json({ error: 'status inválido' });
    }

    const fee = await prisma.condominiumFee.findUnique({ where: { id: Number(id) } });
    if (!fee) return res.status(404).json({ error: 'Fee not found' });

    const updated = await prisma.condominiumFee.update({
      where: { id: fee.id },
      data: { status: FeeStatus[status] },
    });

    res.json(toFeeDto(updated));
  } catch (error) {
    console.error('Update Fee Status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const cascadePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ano, mesesSelecionados, valor, paymentMethod } = req.body as {
      ano: number; mesesSelecionados: number[]; valor: number; paymentMethod: string;
    };

    if (!ano || !valor || valor <= 0 || !paymentMethod) {
      return res.status(400).json({ error: 'ano, valor and paymentMethod are required' });
    }

    const unidade = await prisma.unidade.findUnique({ where: { id: Number(id) } });
    if (!unidade) return res.status(404).json({ error: 'Unidade not found' });

    const feesDoAno = await prisma.condominiumFee.findMany({
      where: { unidadeId: unidade.id, referenceYear: ano },
    });
    const feeByMonth = new Map(feesDoAno.map((f) => [f.referenceMonth, f]));

    let restante = valor;
    const allocations: Array<{ period: string; amount: number }> = [];

    // 1. Abater dívida histórica primeiro
    const dividaAcumulada = getDividaHistorica(unidade);
    let novosPagHist = unidade.pagamentosHistoricos;
    if (dividaAcumulada > 0 && restante > 0) {
      const aplicar = Math.min(restante, dividaAcumulada);
      novosPagHist += aplicar;
      restante -= aplicar;
      allocations.push({ period: 'Dívida acumulada', amount: aplicar });
    }

    // 2. Distribuir entre meses seleccionados (mais antigo → mais recente)
    const mesesOrdenados = [...(mesesSelecionados || [])].sort((a, b) => a - b);
    const paidMonths: string[] = [];
    const feeUpserts: Array<{ mes: number; existing?: CondominiumFee; novoValorPago: number; novoStatus: FeeStatus }> = [];

    for (const mes of mesesOrdenados) {
      if (restante <= 0) break;
      const existing = feeByMonth.get(mes);
      const valorDevido = existing?.amount ?? 1000;
      const jaPago = existing?.valorPago ?? 0;
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

    // 3. Aplicar tudo numa transação
    await prisma.$transaction(async (tx) => {
      for (const u of feeUpserts) {
        let feeId: number;
        if (u.existing) {
          feeId = u.existing.id;
          await tx.condominiumFee.update({
            where: { id: u.existing.id },
            data: {
              valorPago: u.novoValorPago,
              status: u.novoStatus,
              paidAt: u.novoStatus === FeeStatus.PAID ? new Date() : null,
              paymentMethod,
            },
          });
        } else {
          const created = await tx.condominiumFee.create({
            data: {
              unidadeId: unidade.id,
              referenceMonth: u.mes,
              referenceYear: ano,
              amount: 1000,
              valorPago: u.novoValorPago,
              status: u.novoStatus,
              paidAt: u.novoStatus === FeeStatus.PAID ? new Date() : null,
              paymentMethod,
              dueDate: new Date(ano, u.mes - 1, 15),
            },
          });
          feeId = created.id;
        }
        const aplicadoNesteMes = u.novoValorPago - (u.existing?.valorPago ?? 0);
        await tx.feePayment.create({
          data: { feeId, amount: aplicadoNesteMes, paymentMethod, createdByUserId: req.user?.userId },
        });
      }

      if (novosPagHist !== unidade.pagamentosHistoricos) {
        await tx.unidade.update({
          where: { id: unidade.id },
          data: { pagamentosHistoricos: novosPagHist },
        });
      }
    });

    // Saldo total remanescente após este pagamento = histórica restante + Σ dívidas mensais não cobertas
    const feesAtualizadas = await prisma.condominiumFee.findMany({ where: { unidadeId: unidade.id, referenceYear: ano } });
    const dividaHistRestante = Math.max(0, unidade.dividaAnterior - novosPagHist);
    const dividaMensalRestante = feesAtualizadas.reduce((s, f) => s + Math.max(0, f.amount - f.valorPago), 0);

    res.json({
      allocations,
      paidMonths,
      totalPago: valor,
      saldoRemanescente: dividaHistRestante + dividaMensalRestante,
      unidade_id: unidade.id,
      categoria: unidade.categoria,
    });
  } catch (error) {
    console.error('Cascade Payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
