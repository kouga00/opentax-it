import type { FiscalRuleSet } from './rule-set.js';
import { profitabilityCoefficient } from './rule-set.js';

/**
 * Income, substitute tax and INPS computation for a flat-rate professional
 * (Gestione Separata). Pure functions; every step maps to a row of the official
 * Redditi PF return.
 *
 * Sources:
 * - L. 190/2014 art. 1 par. 64: taxable income = collected revenue × profitability
 *   coefficient; social security contributions paid are deducted in full; the tax is
 *   15% (5% under par. 65 for the start year and the four following ones).
 * - Redditi PF 2026 instructions, booklet 3, LM section III: LM22 col. 3 collected
 *   revenue, col. 5 = col. 3 × coefficient; LM34 gross income; LM35 contributions paid
 *   (col. 2: the part that fits within LM34); LM36 = LM34 − LM35 col. 2; LM39 tax.
 * - Redditi PF 2026 instructions, booklet 2, RR section II: INPS base = flat-rate income
 *   (gross, before the contribution deduction) up to the yearly ceiling; contribution =
 *   base × rate (RR5 col. 15). Circ. INPS 62/2026 §2.2: for flat-rate taxpayers the base is
 *   "il rigo LM34, colonna 2" (minus LM37 col. 2), a return row, so in whole euros like the
 *   contribution in RR5 (booklet 1: "Tutti gli importi indicati nella dichiarazione devono
 *   essere arrotondati all'unità di euro"). Advances (40% + 40%) are computed afterwards, in cents.
 * - Advance payments: Circ. AdE 10/E/2016 §4 ("si applicano tutte le disposizioni
 *   vigenti in materia di versamenti a saldo ed in acconto ... dell'IRPEF"); art. 72
 *   D.Lgs. 33/2025 (100% of the previous period's tax net of credits and withholdings);
 *   DPR 435/2001 art. 17 par. 3 (two installments unless the first would not exceed
 *   EUR 103, 40% first); DL 124/2019 art. 58 + AdE resolution 93/E/2019 + Redditi PF 2026
 *   instructions, booklet 2, LM advances (50% + 50% for taxpayers with an ISA-approved
 *   activity, including the flat-rate substitute tax); RN62 (not due below EUR 51.65).
 * - INPS advances: L. 662/1996 art. 1 par. 212 (40% + 40% of the contribution due on the
 *   previous year's income); INPS circular no. 8/2026 §4.2 (computed with the current
 *   year's rate).
 * - Rounding: Redditi PF 2026 instructions, booklet 1, "Modalità di arrotondamento":
 *   "Tutti gli importi indicati nella dichiarazione devono essere arrotondati all'unità di
 *   euro, per eccesso se la frazione decimale è uguale o superiore a cinquanta centesimi";
 *   §7 "Gli importi delle imposte che scaturiscono dalla dichiarazione devono essere versati
 *   arrotondati all'unità di euro, così come determinati nella dichiarazione stessa. Se,
 *   invece, l'ammontare indicato in dichiarazione deve essere successivamente elaborato
 *   (rateazioni) ... arrotondamento al centesimo". The LM rows (income, tax, balance) are
 *   therefore whole euro. Advances are not a return row and are computed in cents from
 *   the whole-euro tax; the INPS contribution is computed in cents as on the F24 forms
 *   prepared by an intermediary for the author (see docs/compliance.md, open points).
 */

/** Rounds to the euro unit as in the tax return (≥ 50 cents up). */
export const roundEuro = (n: number) => Math.round(n + Number.EPSILON);
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface TaxInput {
  /** Tax year. */
  year: number;
  /** Revenue collected in the year (cash basis), EUR — LM22 col. 3 (rounded to the euro for the LM rows; used as is for INPS). */
  collectedRevenue: number;
  /** ATECO 2007 code of the activity. */
  atecoCode: string;
  /** Year the activity started (par. 65: reduced rate for that year and the four following). */
  activityStartYear: number;
  /** The taxpayer meets the par. 65 conditions for the reduced rate. */
  reducedRateEligible: boolean;
  /** Social security contributions actually paid in the year, EUR — LM35 col. 1. */
  contributionsPaid: number;
  /** INPS rate to apply (full or reduced), percentage — RR5 col. 14. */
  inpsRatePct: number;
  /** Tax credits and withholdings to subtract from the tax (LM40 + LM41), EUR. */
  taxCredits?: number;
}

export interface TaxResult {
  coefficientPct: number; // LM22 col. 2
  grossIncome: number; // LM34
  contributionsDeducted: number; // LM35 col. 2
  netIncome: number; // LM36 / LM38
  taxRatePct: number;
  substituteTax: number; // LM39
  taxNetOfCredits: number; // LM42 (base for advances)
  inpsTaxableIncome: number; // RR5 col. 11
  inpsContribution: number; // RR5 col. 15
}

/** Whether the reduced rate applies in `year` (par. 65: start year + 4 following years). */
export function reducedRateApplies(rules: FiscalRuleSet, year: number, activityStartYear: number, eligible: boolean): boolean {
  return eligible && year >= activityStartYear && year < activityStartYear + rules.flatRate.reducedRateYears;
}

export function computeTaxes(rules: FiscalRuleSet, input: TaxInput): TaxResult {
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
  const inpsTaxableIncome = Math.min(grossIncome, rules.inps.incomeCeiling); // RR5 col. 11 from LM34
  const inpsContribution = roundEuro((inpsTaxableIncome * input.inpsRatePct) / 100); // RR5 col. 15
  return { coefficientPct, grossIncome, contributionsDeducted, netIncome, taxRatePct, substituteTax, taxNetOfCredits, inpsTaxableIncome, inpsContribution };
}

export interface AdvanceSchedule {
  /** Total advance due for the following year. */
  total: number;
  /** First instalment (June/July), 0 when paid in a single instalment or not due. */
  first: number;
  /** Second or single instalment (30 November). */
  second: number;
  mode: 'NOT_DUE' | 'SINGLE' | 'TWO_INSTALMENTS';
}

/**
 * Substitute tax advance for the following year (IRPEF rules per Circ. 10/E/2016 §4).
 * `isaSubject`: the taxpayer exercises an activity with an approved ISA within its revenue
 * limit (DL 124/2019 art. 58; res. 93/E/2019): 50% + 50% instead of 40% + 60%.
 */
export function substituteTaxAdvance(rules: FiscalRuleSet, taxNetOfCredits: number, isaSubject = false): AdvanceSchedule {
  const a = rules.advancePayment;
  const total = round2((taxNetOfCredits * a.percentage) / 100);
  if (taxNetOfCredits < a.notDueBelow) return { total: 0, first: 0, second: 0, mode: 'NOT_DUE' };
  const firstPct = isaSubject ? a.isaSubjectsFirstInstallmentPct : a.firstInstallmentPct;
  const first = round2((total * firstPct) / 100);
  if (first <= a.singleIfFirstInstallmentAtMost) return { total, first: 0, second: total, mode: 'SINGLE' };
  return { total, first, second: round2(total - first), mode: 'TWO_INSTALMENTS' };
}

/**
 * INPS advance for the following year: 40% + 40% of the contribution due on this year's
 * income (L. 662/96 par. 212), using the given rate (the following year's rate per INPS circular).
 */
export function inpsAdvance(rules: FiscalRuleSet, inpsTaxableIncome: number, nextYearRatePct: number): AdvanceSchedule {
  const contribution = round2((inpsTaxableIncome * nextYearRatePct) / 100);
  const total = round2((contribution * rules.inps.advancePct) / 100);
  const each = round2(total / rules.inps.advanceInstallments);
  return { total, first: each, second: round2(total - each), mode: 'TWO_INSTALMENTS' };
}

export interface ThresholdStatus {
  collectedRevenue: number;
  accessThreshold: number; // par. 54: stay in the regime next year
  exitThreshold: number; // par. 71: immediate exit
  exceedsAccessThreshold: boolean;
  exceedsExitThreshold: boolean;
}

/** Position against the EUR 85,000 / 100,000 thresholds (L. 190/2014 art. 1 par. 54 and 71). */
export function thresholdStatus(rules: FiscalRuleSet, collectedRevenue: number): ThresholdStatus {
  const accessThreshold = rules.flatRate.revenueThreshold;
  const exitThreshold = rules.flatRate.immediateExitThreshold;
  return {
    collectedRevenue,
    accessThreshold,
    exitThreshold,
    exceedsAccessThreshold: collectedRevenue > accessThreshold,
    exceedsExitThreshold: collectedRevenue > exitThreshold,
  };
}

/** Share of a threshold from which it is shown as "near" (project choice, not a legal value). */
export const THRESHOLD_NEAR_PCT = 80;

export const THRESHOLD_LEVELS = ['OK', 'NEAR', 'OVER'] as const;
export type ThresholdLevel = (typeof THRESHOLD_LEVELS)[number];

export interface ThresholdOutlook extends ThresholdStatus {
  /** Issued documents not yet collected (EUR): they count when collected (cash basis, par. 54 and 71). */
  outstanding: number;
  /** The document being issued, when checking an issue (EUR). */
  invoiceTotal: number;
  /** collected + outstanding + invoiceTotal: what the year reaches if everything is collected this year. */
  projected: number;
  accessLevel: ThresholdLevel;
  exitLevel: ThresholdLevel;
  /** Limit chosen by the taxpayer (e.g. to stay below 85,000), null when not set. */
  personalLimit: number | null;
  projectedOverExit: boolean;
  projectedOverPersonalLimit: boolean;
}

const level = (value: number, threshold: number): ThresholdLevel =>
  value > threshold ? 'OVER' : value >= (threshold * THRESHOLD_NEAR_PCT) / 100 ? 'NEAR' : 'OK';

/**
 * Position against the thresholds on the collected revenue (L. 190/2014 art. 1 par. 54: above 85,000
 * the regime ends from the following year; par. 71: above 100,000 it ends in the same year and VAT
 * is due "a partire dalle operazioni effettuate che comportano il superamento"), plus a projection
 * with the documents not yet collected, used to warn before issuing.
 */
export function thresholdOutlook(
  rules: FiscalRuleSet,
  input: { collectedRevenue: number; outstanding: number; invoiceTotal?: number; personalLimit?: number | null },
): ThresholdOutlook {
  const status = thresholdStatus(rules, input.collectedRevenue);
  const invoiceTotal = round2(input.invoiceTotal ?? 0);
  const outstanding = round2(input.outstanding);
  const projected = round2(input.collectedRevenue + outstanding + invoiceTotal);
  const personalLimit = input.personalLimit ?? null;
  return {
    ...status,
    outstanding,
    invoiceTotal,
    projected,
    accessLevel: level(input.collectedRevenue, status.accessThreshold),
    exitLevel: level(input.collectedRevenue, status.exitThreshold),
    personalLimit,
    projectedOverExit: projected > status.exitThreshold,
    projectedOverPersonalLimit: personalLimit !== null && projected > personalLimit,
  };
}
