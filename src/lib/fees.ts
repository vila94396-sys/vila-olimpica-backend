import { FeeStatus } from '@prisma/client';

export const MESES_LABELS: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
};

export function calcFeeStatus(amount: number, valorPago: number): FeeStatus {
  if (valorPago >= amount) return FeeStatus.PAID;
  if (valorPago > 0) return FeeStatus.PENDING;
  return FeeStatus.OVERDUE;
}

export function getDividaHistorica(u: { dividaAnterior: number; pagamentosHistoricos: number }): number {
  return Math.max(0, u.dividaAnterior - u.pagamentosHistoricos);
}
