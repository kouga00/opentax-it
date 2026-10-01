import type { F24Section } from './f24-schedule.js';
/**
 * Annual limit of EUR 5,000 for credits used in F24 compensation (art. 3 D.Lgs. 33/2025; AdE resolution
 * 110/E of 31/12/2019): above it the credit can be used only from the tenth day after the return is filed
 * and needs the compliance visa (L. 147/2013 art. 1 par. 574). Per resolution 110/E:
 * - the limit applies to "il credito utilizzato in compensazione relativo a un certo periodo d'imposta (anno
 *   di riferimento), anche tenendo conto di quanto fruito nei modelli F24 già acquisiti";
 * - it concerns income taxes and their surcharges, substitute taxes, IRAP and VAT (not INPS credits);
 * - "vertical" compensation (debts of the same tax, listed in the resolution's table) does not count.
 * Rows of the resolution's table for the codes handled here: 1792 → 1790, 1791, 1792; 4001 → 4001, 4033,
 * 4034; 3844 → 3843, 3844; 3801 → none.
 */
export const COMPENSATION_LIMIT = 5000;

export const VERTICAL_COMPENSATION: Readonly<Record<string, readonly string[]>> = {
  '1792': ['1790', '1791', '1792'],
  '4001': ['4001', '4033', '4034'],
  '3844': ['3843', '3844'],
};

export interface CreditUse {
  creditId: string;
  section: F24Section;
  code: string;
  referenceYear: number;
  amount: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Horizontal part of each credit used in one compensation form: a credit counts as vertical only up to the
 * debts of the same tax compensated in that form (the form pools credits, so this is the conservative split).
 * INPS credits are left out: the limit does not concern them.
 */
export function horizontalUses(uses: CreditUse[], debts: Array<{ code: string; amount: number }>): CreditUse[] {
  const verticalLeft = new Map<string, number>();
  for (const [credit, codes] of Object.entries(VERTICAL_COMPENSATION)) {
    verticalLeft.set(credit, round2(debts.filter((d) => codes.includes(d.code)).reduce((s, d) => s + d.amount, 0)));
  }
  return uses
    .filter((u) => u.section !== 'INPS')
    .map((u) => {
      const left = verticalLeft.get(u.code) ?? 0;
      const vertical = Math.min(left, u.amount);
      verticalLeft.set(u.code, round2(left - vertical));
      return { ...u, amount: round2(u.amount - vertical) };
    })
    .filter((u) => u.amount > 0);
}

/** Credits (code + reference year) whose horizontal use in the year, with the earlier forms, goes above the limit. */
export function creditsAboveLimit(current: CreditUse[], earlier: CreditUse[]): Array<{ code: string; referenceYear: number; total: number }> {
  const totals = new Map<string, { code: string; referenceYear: number; total: number }>();
  for (const u of [...earlier, ...current]) {
    const k = `${u.code}|${u.referenceYear}`;
    const t = totals.get(k) ?? { code: u.code, referenceYear: u.referenceYear, total: 0 };
    t.total = round2(t.total + u.amount);
    totals.set(k, t);
  }
  const currentKeys = new Set(current.map((u) => `${u.code}|${u.referenceYear}`));
  return [...totals.entries()].filter(([k, t]) => currentKeys.has(k) && t.total > COMPENSATION_LIMIT).map(([, t]) => t);
}
