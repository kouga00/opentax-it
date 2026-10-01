import { roundEuro } from './rounding.js';
import type { ReturnRow, ReturnRowAction } from './tax-return-lm.js';

/**
 * Rows of the RR form (social security contributions) and of RX31 (result of the substitute tax), with the values
 * computed by the app, for the taxpayer who files the pre-filled Redditi PF alone. Pure, like tax-return-lm.ts; the
 * Italian texts are in the web app.
 *
 * Sources:
 * - Redditi PF 2026 instructions, booklet 2, RR (ade-redditi-pf-2026-fasc2):
 *   - section I, Artigiani and Commercianti (RR2): "Tipologia iscritto" 1 for the owner; col. 1 tax code; col. 2 "il
 *     codice Inps di 17 caratteri [...] utilizzato nel modello F24 per i versamenti eccedenti il minimale"; col. 3
 *     business income; col. 4-5 months; col. 6 box for those without contributions before 1996; col. 7 code "C" for the
 *     35% flat-rate reduction; col. 10 minimum income; col. 11 IVS on it; col. 12 maternity "euro 0,62 mensili"; col.
 *     14 paid on the minimum; col. 16/17 = col. 11 + 12 + 13 − 14 − 15; col. 24 income above the minimum up to the
 *     ceiling; col. 25 IVS on it; col. 27 paid; col. 29/30 = col. 25 + 26 − 27 − 28; RR4 totals of the credits;
 *   - section II, Gestione Separata (RR5): col. 1 code "1" (income of LM section III), col. 2 the income, col. 11 the
 *     taxable income, col. 12-13 months, col. 14 "A aliquota del 24%" or "C aliquota del 26,07%", col. 15 the
 *     contribution, col. 16 the advances paid; RR6 col. 1-2 totals; RR7 debit or RR8 col. 1 credit, split in col. 2
 *     (compensation) and col. 3 (refund).
 * - Redditi PF 2026 instructions, booklet 1, RX (ade-redditi-pf-2026-fasc1): RX31 col. 1 "l'importo del rigo LM46",
 *   col. 2 "l'importo del rigo LM47"; col. 4 refund and col. 5 compensation share col. 2 + col. 3.
 * - AdE guide to the pre-filled Redditi PF 2026: for section I the INPS provides "tipologia iscritto", "codice
 *   azienda", tax code, "codice INPS", periods, reduction, minimum income, contributions due and paid on it, those paid
 *   on the income above the minimum; the income above the minimum (col. 24 and 25) is added by the taxpayer.
 *
 * Amounts are whole euro, as in the return. Not handled: family collaborators, part-year activity (the months and the
 * minimum in proportion are the taxpayer's), credits of the previous year, the 50% reduction of 2025 enrolments (code E).
 */

export interface SeparateSchemeReturnInput {
  /** Income of LM34 col. 2. */
  grossIncome: number;
  /** Income on which the contribution is due (up to the ceiling). */
  inpsTaxableIncome: number;
  inpsContribution: number;
  /** Reduced rate (24%) for those covered by another compulsory scheme or retired; otherwise the full rate. */
  reducedRate: boolean;
  advancesPaid: number;
  /** The activity covers the whole year: months 01-12. */
  wholeYear: boolean;
}

export interface SelfEmployedReturnInput {
  fiscalCode: string;
  /** INPS code (17 digits) of the year, if saved in Imposte. */
  inpsCode?: string;
  /** Business income (LM34 col. 1). */
  grossIncome: number;
  /** Minimum income of the year. */
  incomeFloor: number;
  fixed: { ivs: number; maternity: number };
  /** Paid on the minimum income (fixed installments of the year). */
  fixedPaid: number;
  /** Income above the minimum and contribution on it. */
  excess: { inpsTaxableIncome: number; inpsContribution: number };
  /** Paid on the income above the minimum (advances of the year). */
  excessPaid: number;
  flatRateReduction: boolean;
  seniorityBefore1996: boolean;
  wholeYear: boolean;
}

/** Whole euro, without the -0 that rounding a tiny negative difference gives. */
const euro = (n: number) => roundEuro(n) || 0;

const rowOf = (id: string, value: ReturnRow['value'], action: ReturnRowAction): ReturnRow => {
  const [code, column] = id.split('.');
  return { id, row: code, ...(column && /^\d+$/.test(column) ? { column: Number(column) } : {}), value, action };
};

/** Section II (RR5-RR8): Gestione Separata. */
export function separateSchemeReturnRows(input: SeparateSchemeReturnInput): ReturnRow[] {
  const due = roundEuro(input.inpsContribution);
  const paid = roundEuro(input.advancesPaid);
  const balance = euro(input.inpsContribution - input.advancesPaid);
  return [
    rowOf('RR5.1', '1', 'ENTER'),
    rowOf('RR5.2', roundEuro(input.grossIncome), 'ENTER'),
    rowOf('RR5.11', roundEuro(input.inpsTaxableIncome), 'ENTER'),
    rowOf('RR5.12', input.wholeYear ? '01' : null, input.wholeYear ? 'ENTER' : 'YOURS'),
    rowOf('RR5.13', input.wholeYear ? '12' : null, input.wholeYear ? 'ENTER' : 'YOURS'),
    rowOf('RR5.14', input.reducedRate ? 'A' : 'C', 'ENTER'),
    rowOf('RR5.15', due, 'ENTER'),
    rowOf('RR5.16', paid, 'ENTER'),
    rowOf('RR6.1', due, 'RESULT'),
    rowOf('RR6.2', paid, 'RESULT'),
    ...(balance >= 0 ? [rowOf('RR7', balance, 'RESULT')] : [rowOf('RR8.1', -balance, 'RESULT'), rowOf('RR8.2', -balance, 'ENTER')]),
  ];
}

/** Section I (RR2, owner only, and RR4): Artigiani and Commercianti. */
export function selfEmployedReturnRows(input: SelfEmployedReturnInput): ReturnRow[] {
  const ivs = roundEuro(input.fixed.ivs);
  const maternity = roundEuro(input.fixed.maternity);
  const fixedPaid = roundEuro(input.fixedPaid);
  // Balances on the amounts in cents, rounded once: rounding each term would turn an exact payment into a 1 € difference.
  const fixedBalance = euro(input.fixed.ivs + input.fixed.maternity - input.fixedPaid);
  const excessDue = roundEuro(input.excess.inpsContribution);
  const excessPaid = roundEuro(input.excessPaid);
  const excessBalance = euro(input.excess.inpsContribution - input.excessPaid);
  const credits = Math.max(0, -fixedBalance) + Math.max(0, -excessBalance);
  return [
    rowOf('RR2.type', '1', 'CHECK'),
    rowOf('RR2.1', input.fiscalCode, 'CHECK'),
    rowOf('RR2.2', input.inpsCode ?? null, input.inpsCode ? 'CHECK' : 'YOURS'),
    rowOf('RR2.3', roundEuro(input.grossIncome), 'ENTER'),
    rowOf('RR2.4', input.wholeYear ? '01' : null, input.wholeYear ? 'CHECK' : 'YOURS'),
    rowOf('RR2.5', input.wholeYear ? '12' : null, input.wholeYear ? 'CHECK' : 'YOURS'),
    ...(input.seniorityBefore1996 ? [] : [rowOf('RR2.6', 'X', 'ENTER')]),
    ...(input.flatRateReduction ? [rowOf('RR2.7', 'C', 'CHECK')] : []),
    rowOf('RR2.10', roundEuro(input.incomeFloor), 'CHECK'),
    rowOf('RR2.11', ivs, 'CHECK'),
    rowOf('RR2.12', maternity, 'CHECK'),
    rowOf('RR2.14', fixedPaid, 'CHECK'),
    fixedBalance >= 0 ? rowOf('RR2.16', fixedBalance, 'RESULT') : rowOf('RR2.17', -fixedBalance, 'RESULT'),
    rowOf('RR2.24', roundEuro(input.excess.inpsTaxableIncome), 'ENTER'),
    rowOf('RR2.25', excessDue, 'ENTER'),
    rowOf('RR2.27', excessPaid, 'CHECK'),
    excessBalance >= 0 ? rowOf('RR2.29', excessBalance, 'RESULT') : rowOf('RR2.30', -excessBalance, 'RESULT'),
    ...(credits > 0 ? [rowOf('RR4.1', credits, 'RESULT'), rowOf('RR4.4', credits, 'ENTER')] : []),
  ];
}

/** RX31: the substitute tax balance of LM46 or the credit of LM47, with the credit to use in compensation. */
export function substituteTaxResultRows(lm: ReturnRow[]): ReturnRow[] {
  const debit = lm.find((r) => r.id === 'LM46');
  const credit = lm.find((r) => r.id === 'LM47');
  if (debit) return [rowOf('RX31.1', debit.value, 'RESULT')];
  if (!credit) return [];
  return [rowOf('RX31.2', credit.value, 'RESULT'), rowOf('RX31.5', credit.value, 'ENTER')];
}
