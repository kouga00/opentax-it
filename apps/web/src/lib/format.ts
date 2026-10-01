import type { Customer } from './types';

export function customerLabel(c: Pick<Customer, 'businessName' | 'firstName' | 'lastName'>): string {
  return c.businessName ?? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** "Rivalsa INPS 4%" with the rate of the year's rule set; without the rate when the set is not available. */
export function inpsSurchargeLabel(ratePct?: number): string {
  return ratePct == null ? 'Rivalsa INPS' : `Rivalsa INPS ${ratePct.toLocaleString('it-IT')}%`;
}

/** Percentage in Italian notation, e.g. 26.07 → "26,07%". */
export function formatPct(value: number): string {
  return `${value.toLocaleString('it-IT')}%`;
}

/**
 * Amount in Italian notation, e.g. 3367 → "3.367,00 €". `useGrouping: 'always'` because the
 * Italian locale leaves four-digit numbers without the thousands separator ("3367,00 €").
 */
export function formatMoney(value: string | number, currency = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency, useGrouping: 'always' }).format(Number(value));
}

/** Years from `from` to `to`, newest first, always including `selected` (e.g. a year typed in the URL). */
export function yearRange(from: number, to: number, selected?: number): number[] {
  const years = new Set(Array.from({ length: to - from + 1 }, (_, i) => to - i));
  if (selected !== undefined) years.add(selected);
  return [...years].sort((a, b) => b - a);
}

/** Today in Italy, as YYYY-MM-DD: dates are in the taxpayer's calendar, not in UTC nor in the browser's time zone. */
export function todayInItaly(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(now);
}

/** Date and time in Italian time, e.g. "26/09/2026, 18:44:48", the same on the server and in the browser. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
}
