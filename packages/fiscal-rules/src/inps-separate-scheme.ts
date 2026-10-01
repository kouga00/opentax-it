import type { AdvanceSchedule } from './advance-schedule.js';
import { deadline, type Deadline } from './deadline.js';
import type { F24SectionRows } from './f24-schedule.js';
import type { FiscalRuleSet } from './rule-set.js';
import { roundCents, roundEuro } from './rounding.js';

/**
 * INPS contributions of the Gestione Separata for a flat-rate professional: contribution, advances,
 * the INPS rows of the F24 and the deadlines. The rule set section `inps` and the reasons `inpsReasons`
 * belong to it. Registered in contribution-schemes.ts.
 *
 * Sources:
 * - Redditi PF 2026 instructions, booklet 2, RR section II: INPS base = flat-rate income
 *   (gross, before the contribution deduction) up to the yearly ceiling; contribution =
 *   base × rate (RR5 col. 15). Circ. INPS 62/2026 §2.2: for flat-rate taxpayers the base is
 *   "il rigo LM34, colonna 2" (minus LM37 col. 2), a return row, so in whole euros like the
 *   contribution in RR5 (booklet 1: "Tutti gli importi indicati nella dichiarazione devono
 *   essere arrotondati all'unità di euro"). Advances (40% + 40%) are computed afterwards, in cents.
 * - INPS advances: L. 662/1996 art. 1 par. 212 (40% + 40% of the contribution due on the
 *   previous year's income); INPS circular no. 8/2026 §4.2 (computed with the current
 *   year's rate).
 * - INPS, "F24 per professionisti iscritti alla Gestione Separata": office code of the
 *   residence, reason PXX (single payment) / PXXR (installments), P10 / P10R at the 24% rate,
 *   interest with reason DPPI on a separate row. Circ. INPS 62/2026 §3-4: the deferral surcharge
 *   is paid with DPPI together with the interest.
 */

export interface SeparateSchemeContribution {
  inpsTaxableIncome: number; // RR5 col. 11
  inpsContribution: number; // RR5 col. 15
}

/** Contribution on the flat-rate gross income (LM34), capped at the yearly ceiling. */
export function computeSeparateSchemeContribution(rules: FiscalRuleSet, grossIncome: number, ratePct: number): SeparateSchemeContribution {
  const inpsTaxableIncome = Math.min(grossIncome, rules.inps.incomeCeiling); // RR5 col. 11 from LM34
  const inpsContribution = roundEuro((inpsTaxableIncome * ratePct) / 100); // RR5 col. 15
  return { inpsTaxableIncome, inpsContribution };
}

/**
 * INPS advance for the following year: 40% + 40% of the contribution due on this year's
 * income (L. 662/96 par. 212), using the given rate (the following year's rate per INPS circular).
 */
export function inpsAdvance(rules: FiscalRuleSet, inpsTaxableIncome: number, nextYearRatePct: number): AdvanceSchedule {
  const contribution = roundCents((inpsTaxableIncome * nextYearRatePct) / 100);
  const total = roundCents((contribution * rules.inps.advancePct) / 100);
  const each = roundCents(total / rules.inps.advanceInstallments);
  return { total, first: each, second: roundCents(total - each), mode: 'TWO_INSTALMENTS' };
}

export interface SeparateSchemeF24Options {
  /** Income year the balance refers to (advances refer to taxYear + 1). */
  taxYear: number;
  inpsOfficeCode: string;
  /** 24% rate: reasons P10/P10R instead of PXX/PXXR. */
  reducedRate: boolean;
  /** Paid in a single payment (PXX/P10) rather than in installments (PXXR/P10R). */
  single: boolean;
}

/** INPS rows of the Gestione Separata on the F24 forms of `taxYear`. */
export function separateSchemeF24Rows(rules: FiscalRuleSet, opts: SeparateSchemeF24Options): F24SectionRows {
  const ir = rules.inpsReasons;
  const { taxYear } = opts;
  const singleReason = opts.reducedRate ? ir.contributionReducedRate : ir.contribution;
  const reason = opts.single ? singleReason : opts.reducedRate ? ir.installmentsReducedRate : ir.installments;
  return {
    section: 'INPS',
    debts: [
      { key: 'inpsBalance', role: 'BALANCE', code: reason, referenceYear: taxYear, description: `INPS Gestione Separata balance ${taxYear}` },
      { key: 'inpsFirstAdvance', role: 'FIRST_ADVANCE', code: reason, referenceYear: taxYear + 1, description: `INPS Gestione Separata first advance ${taxYear + 1}` },
    ],
    secondAdvance: { key: 'inpsSecondAdvance', role: 'SECOND_ADVANCE', code: singleReason, referenceYear: taxYear + 1, description: `INPS Gestione Separata second advance ${taxYear + 1}` },
    interestCode: ir.interest,
    officeCode: opts.inpsOfficeCode,
    surchargeWithInterest: true,
  };
}

/** Deadlines of the year of `rules`: balance and advances at the income tax deadlines (L. 662/1996 art. 1 par. 212). */
export function separateSchemeDeadlines(rules: FiscalRuleSet, firstDate: string, secondDate: string, extensionSource?: string): Deadline[] {
  const ir = rules.inpsReasons;
  const year = rules.year;
  const each = rules.inps.advancePct / rules.inps.advanceInstallments;
  return [
    deadline('INPS_BALANCE', firstDate, `INPS Gestione Separata balance ${year - 1}`, { taxYear: year - 1, splittable: true }, ir.contribution, extensionSource),
    deadline('INPS_FIRST_ADVANCE', firstDate, `INPS first advance ${year} (${each}%)`, { taxYear: year, percentage: each, splittable: true }, ir.contribution, extensionSource),
    deadline('INPS_SECOND_ADVANCE', secondDate, `INPS second advance ${year} (${each}%)`, { taxYear: year, percentage: each, splittable: false }, ir.contribution),
  ];
}
