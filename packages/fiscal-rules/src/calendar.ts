/**
 * Calendar utilities for tax deadlines.
 *
 * Deadlines falling on a Saturday or public holiday move to the next business day:
 * DL 13 May 2011 no. 70 (conv. L. 106/2011), art. 7 par. 1 lett. h) and par. 2 lett. l).
 * The Redditi PF 2026 instructions apply it e.g. to 31/10/2026 (Saturday) → 2/11/2026.
 */

const DAY_MS = 24 * 3600 * 1000;

export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return utcDate(y, m, d);
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Easter Sunday (Meeus/Jones/Butcher algorithm, Gregorian calendar). */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utcDate(year, month, day);
}

/**
 * Italian national public holidays (L. 260/1949 and later amendments). Fixed dates and Easter are
 * computed for any year; a holiday added by law applies from its first year only:
 * 4 October (St Francis of Assisi) from 2026, L. 8 October 2025 no. 151 (GU no. 236 of 10/10/2025).
 */
export function italianPublicHolidays(year: number): Set<string> {
  const fixed: Array<[number, number]> = [
    [1, 1], [1, 6], [4, 25], [5, 1], [6, 2], [8, 15], [11, 1], [12, 8], [12, 25], [12, 26],
    ...(year >= 2026 ? [[10, 4] as [number, number]] : []),
  ];
  const set = new Set(fixed.map(([m, d]) => toIsoDate(utcDate(year, m, d))));
  const easter = easterSunday(year);
  set.add(toIsoDate(easter));
  set.add(toIsoDate(new Date(easter.getTime() + DAY_MS))); // Easter Monday
  return set;
}

export function isBusinessDay(d: Date, holidays = italianPublicHolidays(d.getUTCFullYear())): boolean {
  const dow = d.getUTCDay();
  return dow !== 0 && dow !== 6 && !holidays.has(toIsoDate(d));
}

/** First business day ≥ date (Saturday/Sunday/holiday → next business day). */
export function nextBusinessDay(d: Date): Date {
  let cur = d;
  while (!isBusinessDay(cur)) cur = new Date(cur.getTime() + DAY_MS);
  return cur;
}

/** The business day that is `n` business days before `d` (n = 3 → third-to-last business day before the date). */
export function businessDaysBefore(d: Date, n: number): Date {
  let cur = d;
  let count = 0;
  while (count < n) {
    cur = new Date(cur.getTime() - DAY_MS);
    if (isBusinessDay(cur)) count += 1;
  }
  return cur;
}
