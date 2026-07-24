/**
 * Cash projection for the financial baseline strip.
 *
 * Deliberately strategic-scale, not accounting-scale: starting cash and a
 * flat monthly burn, adjusted by the revenue and costs attached to
 * milestones at their target dates. Superseded and archived milestones do
 * not count. Past one-off amounts are assumed to already be inside
 * starting cash; recurring revenue accrues from a milestone's date (or
 * today, whichever is later).
 */
import type { CampaignState, Milestone } from '../types';
import { parseDate, toIso, daysBetween, todayIso, fmtDayMonth } from './time';

export interface CashPoint {
  iso: string;
  cash: number;
  revenueMonthly: number;
}

const counts = (m: Milestone) => !['superseded', 'archived'].includes(m.status);

const DAYS_PER_MONTH = 30.44;

export const projectCash = (state: CampaignState, endIso: string): CashPoint[] => {
  const start = todayIso();
  const ms = state.milestones.filter(counts);

  const recurringAt = (iso: string) =>
    ms.reduce((sum, m) => sum + (m.revenueMonthly && m.targetDate <= iso ? m.revenueMonthly : 0), 0);

  const points: CashPoint[] = [
    { iso: start, cash: state.finance.startingCash, revenueMonthly: recurringAt(start) },
  ];

  let cash = state.finance.startingCash;
  let cursor = parseDate(start);
  const end = parseDate(endIso);

  while (cursor < end) {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
    const stepEnd = next > end ? end : next;
    const frac = daysBetween(cursor, stepEnd) / DAYS_PER_MONTH;
    const cursorIso = toIso(cursor);
    const stepEndIso = toIso(stepEnd);

    cash -= state.finance.monthlyBurn * frac;
    cash += recurringAt(cursorIso) * frac;
    ms.forEach((m) => {
      if (m.targetDate > cursorIso && m.targetDate <= stepEndIso) {
        cash += (m.revenueOneOff ?? 0) - (m.costToReach ?? 0);
      }
    });

    points.push({ iso: stepEndIso, cash, revenueMonthly: recurringAt(stepEndIso) });
    cursor = stepEnd;
  }
  return points;
};

/** The projected point in force at a date (month resolution). */
export const cashAt = (points: CashPoint[], iso: string): CashPoint => {
  let last = points[0];
  for (const p of points) {
    if (p.iso <= iso) last = p;
    else break;
  }
  return last;
};

/** First projected month where cash goes below zero, if any. */
export const cashOutIso = (points: CashPoint[]): string | null => {
  for (const p of points) {
    if (p.cash < 0) return p.iso;
  }
  return null;
};

/** $180k, $4.5k, $22k/mo style formatting. */
export const fmtMoney = (n: number): string => {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1000) {
    const k = abs / 1000;
    return `${sign}$${k >= 100 ? Math.round(k) : Math.round(k * 10) / 10}k`;
  }
  return `${sign}$${Math.round(abs)}`;
};

export const fmtCashOut = (points: CashPoint[]): string => {
  const out = cashOutIso(points);
  if (!out) return 'Beyond 2031';
  const d = parseDate(out);
  return `${fmtDayMonth(out).split(' ')[1]} ${d.getFullYear()}`;
};
