import type { SocialSecuritySchemeId } from './contribution-schemes.js';
import { roundEuro } from './rounding.js';
import type { SubstituteTaxResult } from './substitute-tax.js';

/**
 * Rows of the LM form (sections III and IV, flat-rate regime) with the values computed by the app, for the taxpayer
 * who files the pre-filled Redditi PF alone. Pure: it only arranges values computed elsewhere (substitute-tax.ts,
 * taxes summary); the Italian texts of every row are in the web app.
 *
 * Sources:
 * - Redditi PF 2026 instructions, booklet 3, LM sections III and IV (ade-redditi-pf-2026-fasc3): LM21 col. 3 box of
 *   the 5% rate; LM22 col. 1 ATECO 2007 code, col. 2 coefficient, col. 3 "ricavi e compensi percepiti", col. 5
 *   col. 3 × col. 2, col. 6 code "1" business or "2" self-employment; LM34 col. 1 income of Artigiani and
 *   Commercianti, col. 2 of the Gestione Separata, col. 3 total; LM35 col. 1 contributions "versati nel presente
 *   periodo d'imposta", col. 2 the part that "trova capienza" in LM34; LM36 = LM34 − LM35 col. 2; LM38 = LM36 − LM37;
 *   LM39 tax on LM38; LM42 = LM39 − LM40 col. 41 − LM41; LM45 col. 2 advances paid with codes 1790 and 1791, without
 *   surcharges and interest; LM46/LM47 = LM42 − LM43 + LM44 − LM45 col. 2, reported in RX31 col. 1/col. 2; LM49 the
 *   excess of LM35 col. 1 over col. 2, deductible in RP21.
 * - AdE guide to the pre-filled Redditi PF 2026 and page "Quadro LM" (ade-guida-precompilata-redditi-pf-2026,
 *   ade-infoprecompilata-quadro-lm): LM22-LM27 col. 1 and col. 3 are proposed, col. 3 from the invoices by issue date
 *   ("presunzione [...] che il pagamento sia stato effettuato alla data di emissione della fattura"); the contributions
 *   paid are "riportati solo nel foglio informativo" and go in LM35 by the taxpayer; surpluses and advances of the
 *   substitute tax are proposed from the previous return and the F24 forms.
 *
 * LM43 and LM44 come from the credit registry (the previous year's 1792 credit and its uses in the F24 forms).
 *
 * Not handled: past losses (LM37), income in two modules (5% and 15% in the same year), several ATECO groups,
 * copyright income (col. 4), the split of LM40 by credit: the rows say so.
 */

/**
 * What the taxpayer does with a row: ENTER a value the pre-filled return does not propose; CHECK a value it proposes
 * (and correct it); RESULT a value that follows from the rows above; YOURS a value the app does not know.
 */
export type ReturnRowAction = 'ENTER' | 'CHECK' | 'RESULT' | 'YOURS';

export interface ReturnRow {
  /** Row and column, e.g. "LM22.3"; the key of its texts in the web app. */
  id: string;
  row: string;
  column?: number;
  value: number | string | null;
  action: ReturnRowAction;
}

export interface LmReturnInput {
  scheme: SocialSecuritySchemeId;
  /** ATECO 2007 code used for the coefficient. */
  atecoCode: string;
  /** Revenue collected in the year (cash basis), EUR. */
  collectedRevenue: number;
  tax: SubstituteTaxResult;
  /** Contributions paid in the year, EUR (LM35 col. 1). */
  contributionsPaid: number;
  /** Tax credits and withholdings entered by the taxpayer (LM40 col. 41 + LM41), EUR. */
  taxCredits: number;
  /** Substitute tax advances paid for the year, without surcharges and interest (LM45 col. 2), EUR. */
  taxAdvancesPaid: number;
  /** Reduced rate of par. 65 applied (LM21 col. 3). */
  reducedRate: boolean;
  /**
   * Credit of the previous return (LM43) and the part already used in the F24 forms (LM44), from the credit
   * registry; undefined when the registry has none, and the rows are left to check.
   */
  previousCredit?: { amount: number; used: number };
}

/** Artigiani and Commercianti earn business income; the Gestione Separata and the professional funds self-employment income. */
const businessIncome = (scheme: SocialSecuritySchemeId) => scheme === 'INPS_ARTISANS' || scheme === 'INPS_TRADERS';

export function lmReturnRows(input: LmReturnInput): ReturnRow[] {
  const { tax } = input;
  const row = (id: string, value: ReturnRow['value'], action: ReturnRowAction): ReturnRow => {
    const [code, column] = id.split('.');
    return { id, row: code, ...(column && /^\d+$/.test(column) ? { column: Number(column) } : {}), value, action };
  };
  const contributions = roundEuro(input.contributionsPaid);
  // LM40 col. 41: "Tale somma non può essere superiore all'ammontare dell'imposta sostitutiva".
  const credits = Math.min(roundEuro(input.taxCredits), tax.substituteTax);
  const advances = roundEuro(input.taxAdvancesPaid);
  // LM42 = LM39 − LM40 col. 41 − LM41 (credits capped above, so not negative); LM43 and LM44 are the taxpayer's, proposed from the previous return.
  const difference = tax.substituteTax - credits;
  const previous = input.previousCredit ? { amount: roundEuro(input.previousCredit.amount), used: roundEuro(input.previousCredit.used) } : undefined;
  // LM46/LM47 = LM42 − LM43 + LM44 − LM45 col. 2.
  const balance = difference - (previous?.amount ?? 0) + (previous?.used ?? 0) - advances;
  const rows: ReturnRow[] = [
    row('LM21.4', null, 'YOURS'),
    row('LM21.type', businessIncome(input.scheme) ? 'Impresa' : 'Autonomo', 'ENTER'),
    ...(input.reducedRate ? [row('LM21.3', 'X', 'ENTER')] : []),
    row('LM22.1', input.atecoCode, 'CHECK'),
    row('LM22.2', tax.coefficientPct, 'ENTER'),
    row('LM22.3', roundEuro(input.collectedRevenue), 'CHECK'),
    row('LM22.5', tax.grossIncome, 'RESULT'),
    row('LM22.6', businessIncome(input.scheme) ? '1' : '2', 'ENTER'),
    ...(businessIncome(input.scheme) ? [row('LM34.1', tax.grossIncome, 'RESULT')] : []),
    ...(input.scheme === 'INPS_SEPARATE' ? [row('LM34.2', tax.grossIncome, 'RESULT')] : []),
    row('LM34.3', tax.grossIncome, 'RESULT'),
    row('LM35.1', contributions, 'ENTER'),
    row('LM35.2', tax.contributionsDeducted, 'RESULT'),
    row('LM36', tax.netIncome, 'RESULT'),
    row('LM38', tax.netIncome, 'RESULT'),
    row('LM39', tax.substituteTax, 'RESULT'),
    ...(credits > 0 ? [row('LM40.41', credits, 'YOURS')] : []),
    row('LM42', difference, 'RESULT'),
    row('LM43', previous?.amount ?? null, 'CHECK'),
    row('LM44', previous?.used ?? null, 'CHECK'),
    row('LM45.2', advances, 'CHECK'),
    balance >= 0 ? row('LM46', balance, 'RESULT') : row('LM47', -balance, 'RESULT'),
    ...(contributions > tax.contributionsDeducted ? [row('LM49', contributions - tax.contributionsDeducted, 'RESULT')] : []),
  ];
  return rows;
}
