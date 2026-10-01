import type { AdvanceSchedule } from './advance-schedule.js';
import type { F24SectionRows } from './f24-schedule.js';
import type { FiscalRuleSet } from './rule-set.js';
import { profitabilityCoefficient } from './rule-set.js';
import { roundCents, roundEuro } from './rounding.js';

/**
 * Substitute tax of a flat-rate taxpayer ("imposta sostitutiva"): income, tax, advances and the
 * Treasury rows of the F24. It does not depend on the social security scheme: it only receives the
 * contributions paid in the year, deducted from the income whatever the scheme (LM35).
 * Pure functions; every step maps to a row of the official Redditi PF return.
 *
 * Sources:
 * - L. 190/2014 art. 1 par. 64: taxable income = collected revenue × profitability
 *   coefficient; social security contributions paid are deducted in full; the tax is
 *   15% (5% under par. 65 for the start year and the four following ones).
 * - Redditi PF 2026 instructions, booklet 3, LM section III: LM22 col. 3 collected
 *   revenue, col. 5 = col. 3 × coefficient; LM34 gross income; LM35 contributions paid
 *   (col. 2: the part that fits within LM34); LM36 = LM34 − LM35 col. 2; LM39 tax.
 * - Advance payments: Circ. AdE 10/E/2016 §4 ("si applicano tutte le disposizioni
 *   vigenti in materia di versamenti a saldo ed in acconto ... dell'IRPEF"); art. 72
 *   D.Lgs. 33/2025 (100% of the previous period's tax net of credits and withholdings);
 *   DPR 435/2001 art. 17 par. 3 (two installments unless the first would not exceed
 *   EUR 103, 40% first); DL 124/2019 art. 58 + AdE resolution 93/E/2019 + Redditi PF 2026
 *   instructions, booklet 2, LM advances (50% + 50% for taxpayers with an ISA-approved
 *   activity, including the flat-rate substitute tax); RN62 (not due below EUR 51.65).
 * - Rounding (rounding.ts): the LM rows (income, tax, balance) are whole euro; advances are not
 *   a return row and are computed in cents from the whole-euro tax.
 * - F24 codes: AdE, "Tabella codici tributo" (Erario): 1792 balance, 1790 first advance, 1791
 *   second or single advance, 1668 installment interest (values in the rule set, `taxCodes`).
 */

export interface SubstituteTaxInput {
  /** Tax year. */
  year: number;
  /** Revenue collected in the year (cash basis), EUR — LM22 col. 3, rounded to the euro here. */
  collectedRevenue: number;
  /** ATECO 2007 code of the activity. */
  atecoCode: string;
  /** Year the activity started (par. 65: reduced rate for that year and the four following). */
  activityStartYear: number;
  /** The taxpayer meets the par. 65 conditions for the reduced rate. */
  reducedRateEligible: boolean;
  /** Social security contributions actually paid in the year, any scheme, EUR — LM35 col. 1. */
  contributionsPaid: number;
  /** Tax credits and withholdings to subtract from the tax (LM40 + LM41), EUR. */
  taxCredits?: number;
}

export interface SubstituteTaxResult {
  coefficientPct: number; // LM22 col. 2
  grossIncome: number; // LM34
  contributionsDeducted: number; // LM35 col. 2
  netIncome: number; // LM36 / LM38
  taxRatePct: number;
  substituteTax: number; // LM39
  taxNetOfCredits: number; // LM42 (base for advances)
}

/** Whether the reduced rate applies in `year` (par. 65: start year + 4 following years). */
export function reducedRateApplies(rules: FiscalRuleSet, year: number, activityStartYear: number, eligible: boolean): boolean {
  return eligible && year >= activityStartYear && year < activityStartYear + rules.flatRate.reducedRateYears;
}

export function computeSubstituteTax(rules: FiscalRuleSet, input: SubstituteTaxInput): SubstituteTaxResult {
  const coefficientPct = profitabilityCoefficient(rules, input.atecoCode);
  const collectedRevenue = roundEuro(input.collectedRevenue); // LM22 col. 3
  const grossIncome = roundEuro((collectedRevenue * coefficientPct) / 100);
  const contributionsDeducted = Math.min(roundEuro(input.contributionsPaid), grossIncome);
  const netIncome = roundEuro(grossIncome - contributionsDeducted);
  const taxRatePct = reducedRateApplies(rules, input.year, input.activityStartYear, input.reducedRateEligible)
    ? rules.flatRate.reducedRatePct
    : rules.flatRate.standardRatePct;
  const substituteTax = roundEuro((netIncome * taxRatePct) / 100);
  const taxNetOfCredits = Math.max(0, roundEuro(substituteTax - roundEuro(input.taxCredits ?? 0)));
  return { coefficientPct, grossIncome, contributionsDeducted, netIncome, taxRatePct, substituteTax, taxNetOfCredits };
}

/**
 * Substitute tax advance for the following year (IRPEF rules per Circ. 10/E/2016 §4).
 * `isaSubject`: the taxpayer exercises an activity with an approved ISA within its revenue
 * limit (DL 124/2019 art. 58; res. 93/E/2019): 50% + 50% instead of 40% + 60%.
 */
export function substituteTaxAdvance(rules: FiscalRuleSet, taxNetOfCredits: number, isaSubject = false): AdvanceSchedule {
  const a = rules.advancePayment;
  const total = roundCents((taxNetOfCredits * a.percentage) / 100);
  if (taxNetOfCredits < a.notDueBelow) return { total: 0, first: 0, second: 0, mode: 'NOT_DUE' };
  const firstPct = isaSubject ? a.isaSubjectsFirstInstallmentPct : a.firstInstallmentPct;
  const first = roundCents((total * firstPct) / 100);
  if (first <= a.singleIfFirstInstallmentAtMost) return { total, first: 0, second: total, mode: 'SINGLE' };
  return { total, first, second: roundCents(total - first), mode: 'TWO_INSTALMENTS' };
}

/** Treasury rows of the substitute tax on the F24 forms of `taxYear` (balance, advances for the following year). */
export function substituteTaxF24Rows(rules: FiscalRuleSet, taxYear: number): F24SectionRows {
  const tc = rules.taxCodes;
  return {
    section: 'TREASURY',
    debts: [
      { key: 'taxBalance', role: 'BALANCE', code: tc.substituteTaxBalance, referenceYear: taxYear, description: `Substitute tax balance ${taxYear}` },
      { key: 'taxFirstAdvance', role: 'FIRST_ADVANCE', code: tc.substituteTaxFirstAdvance, referenceYear: taxYear + 1, description: `Substitute tax first advance ${taxYear + 1}` },
    ],
    secondAdvance: { key: 'taxSecondAdvance', role: 'SECOND_ADVANCE', code: tc.substituteTaxSecondAdvance, referenceYear: taxYear + 1, description: `Substitute tax second/single advance ${taxYear + 1}` },
    interestCode: tc.installmentInterest,
    surchargeWithInterest: false,
  };
}
