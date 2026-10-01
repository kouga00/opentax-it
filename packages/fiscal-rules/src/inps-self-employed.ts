import type { AdvanceSchedule } from './advance-schedule.js';
import { deadline, type Deadline } from './deadline.js';
import type { F24SectionRows } from './f24-schedule.js';
import type { FiscalRuleSet } from './rule-set.js';
import { roundCents, roundEuro } from './rounding.js';

/**
 * INPS contributions of Artigiani and Commercianti for a flat-rate taxpayer: the contribution on the minimum income,
 * paid in four fixed installments, and the contribution on the income above the minimum, paid with balance and advances
 * at the income tax deadlines; the INPS rows of the F24 and the deadlines. Values in the rule set section
 * `inpsSelfEmployed`, each with its source (circular INPS 14/2026 for 2026, 38/2025 for 2025).
 *
 * Sources:
 * - Circ. INPS 14/2026 §2-4: minimum income ("minimale") and rates (24% artisans, 24.48% traders; one point more above
 *   the first band), ceiling for those with and without contributions before 1996; §1 maternity contribution
 *   "0,62 euro mensili"; §9 installments and "saldo 2025, primo acconto 2026 e secondo acconto 2026".
 * - L. 190/2014 art. 1 par. 77: the flat-rate income "costituisce base imponibile" and the contribution is "ridotta
 *   del 35 per cento" for those who apply (par. 83); Circ. INPS 35/2016: the reduction applies to the contribution
 *   "sia quella sul reddito entro il minimale, sia quella sul reddito eventualmente eccedente", while the maternity
 *   contribution "Risulta in ogni caso dovuto".
 * - Redditi PF 2026 booklet 3, LM34: the income of the flat-rate taxpayer "afferenti la gestione speciale Artigiani e
 *   commercianti" (gross, before the contributions deduction), like the Gestione Separata base.
 * - Redditi PF 2026 booklet 2, "INPS - Modalità di calcolo degli acconti": "due acconti di pari importo", on the
 *   previous year's income above the minimum "utilizzando i minimali e massimali previsti per l'anno 2026" and the
 *   rates of the same year.
 * - INPS sheet "F24 per artigiani e commercianti": reasons AF/CF (minimum), AP/CP (above the minimum), APR/CPR
 *   (installments); "il codice INPS, rilevato dalla comunicazione inviata dall'Istituto con i modelli di pagamento
 *   (composto da 17 cifre)". API/CPI are listed by the AdE reasons table without a description: the real 2026 forms
 *   of a member use them for the installment interest, next to APR (the choice is documented in docs/compliance.md).
 *
 * Rounding (project choices, documented): the contribution above the minimum, a return row (RR), is in whole euros like
 * the Gestione Separata contribution; advances are in cents; the fixed contribution is in cents as in the circular, and
 * its four installments are equal cents with the remainder on the last one.
 */

export type SelfEmployedKind = 'ARTISANS' | 'TRADERS';

export interface SelfEmployedOptions {
  kind: SelfEmployedKind;
  /** Flat-rate contribution scheme requested (L. 190/2014 par. 77 and 83): 35% less. */
  flatRateReduction: boolean;
  /** Contributions before 1 January 1996: the lower ceiling applies. */
  seniorityBefore1996: boolean;
}

export interface FixedContribution {
  /** IVS contribution on the minimum income, after the flat-rate reduction. */
  ivs: number;
  /** Maternity contribution for the year (0.62 × 12). */
  maternity: number;
  total: number;
  installments: Array<{ number: number; date: string; amount: number }>;
}

export interface ExcessContribution {
  /** Income above the minimum, up to the ceiling. */
  inpsTaxableIncome: number;
  /** Contribution on it (whole euros), after the flat-rate reduction. */
  inpsContribution: number;
}

function params(rules: FiscalRuleSet) {
  if (!rules.inpsSelfEmployed) throw new Error(`Rule set ${rules.year} has no INPS Artigiani e Commercianti section: activate a newer version`);
  return rules.inpsSelfEmployed;
}

const reduction = (rules: FiscalRuleSet, opts: SelfEmployedOptions) => (opts.flatRateReduction ? 1 - params(rules).flatRateReductionPct / 100 : 1);

function rates(rules: FiscalRuleSet, kind: SelfEmployedKind) {
  const p = params(rules);
  return kind === 'ARTISANS' ? { base: p.artisansRatePct, higher: p.artisansHigherRatePct } : { base: p.tradersRatePct, higher: p.tradersHigherRatePct };
}

export function selfEmployedReasons(rules: FiscalRuleSet, kind: SelfEmployedKind) {
  const p = params(rules);
  return kind === 'ARTISANS' ? p.artisansReasons : p.tradersReasons;
}

/** Contribution on the minimum income, in four installments at the dates of the circular. */
export function selfEmployedFixedContribution(rules: FiscalRuleSet, opts: SelfEmployedOptions): FixedContribution {
  const p = params(rules);
  const ivs = roundCents(((p.incomeFloor * rates(rules, opts.kind).base) / 100) * reduction(rules, opts));
  const maternity = roundCents(p.maternityMonthly * 12);
  const total = roundCents(ivs + maternity);
  // Whole cents, so that the installments add up to the total exactly.
  const cents = Math.round(total * 100);
  const each = Math.floor(cents / p.fixedInstallmentDates.length);
  const installments = p.fixedInstallmentDates.map((date, i, all) => ({
    number: i + 1,
    date,
    amount: (i === all.length - 1 ? cents - each * (all.length - 1) : each) / 100,
  }));
  return { ivs, maternity, total, installments };
}

/** Contribution on the income above the minimum, computed with the values of `rules`, before rounding. */
function excess(rules: FiscalRuleSet, grossIncome: number, opts: SelfEmployedOptions) {
  const p = params(rules);
  const ceiling = opts.seniorityBefore1996 ? p.incomeCeilingWithSeniority : p.incomeCeiling;
  const taxable = Math.max(0, Math.min(grossIncome, ceiling) - p.incomeFloor);
  const r = rates(rules, opts.kind);
  const inFirstBand = Math.max(0, Math.min(grossIncome, ceiling, p.higherRateThreshold) - p.incomeFloor);
  const contribution = ((inFirstBand * r.base + (taxable - inFirstBand) * r.higher) / 100) * reduction(rules, opts);
  return { taxable, contribution };
}

/** Contribution on the income above the minimum for the income year of `rules` (balance, RR section I). */
export function selfEmployedExcessContribution(rules: FiscalRuleSet, grossIncome: number, opts: SelfEmployedOptions): ExcessContribution {
  const { taxable, contribution } = excess(rules, grossIncome, opts);
  return { inpsTaxableIncome: taxable, inpsContribution: roundEuro(contribution) };
}

/** Advances for the following year: this year's income with the following year's minimum, ceilings and rates, in equal parts. */
export function selfEmployedAdvance(nextRules: FiscalRuleSet, grossIncome: number, opts: SelfEmployedOptions): AdvanceSchedule {
  const p = params(nextRules);
  const total = roundCents((excess(nextRules, grossIncome, opts).contribution * p.advancePct) / 100);
  if (total <= 0) return { total: 0, first: 0, second: 0, mode: 'NOT_DUE' };
  const first = roundCents(total / p.advanceInstallments);
  return { total, first, second: roundCents(total - first), mode: 'TWO_INSTALMENTS' };
}

export interface SelfEmployedF24Options {
  taxYear: number;
  kind: SelfEmployedKind;
  inpsOfficeCode: string;
  single: boolean;
  /** INPS code (17 digits) of the contribution above the minimum, by year: the balance uses taxYear, the advances taxYear + 1. */
  excessCodes: Partial<Record<number, string>>;
}

/** INPS rows of the contribution above the minimum on the F24 forms of `taxYear` (balance and advances). */
export function selfEmployedF24Rows(rules: FiscalRuleSet, opts: SelfEmployedF24Options): F24SectionRows {
  const r = selfEmployedReasons(rules, opts.kind);
  const { taxYear } = opts;
  const reason = opts.single ? r.excess : r.excessInstallments;
  const label = opts.kind === 'ARTISANS' ? 'INPS Artigiani' : 'INPS Commercianti';
  return {
    section: 'INPS',
    debts: [
      { key: 'inpsBalance', role: 'BALANCE', code: reason, referenceYear: taxYear, positionCode: opts.excessCodes[taxYear], description: `${label} balance above the minimum ${taxYear}` },
      { key: 'inpsFirstAdvance', role: 'FIRST_ADVANCE', code: reason, referenceYear: taxYear + 1, positionCode: opts.excessCodes[taxYear + 1], description: `${label} first advance above the minimum ${taxYear + 1}` },
    ],
    secondAdvance: { key: 'inpsSecondAdvance', role: 'SECOND_ADVANCE', code: r.excess, referenceYear: taxYear + 1, positionCode: opts.excessCodes[taxYear + 1], description: `${label} second advance above the minimum ${taxYear + 1}` },
    interestCode: r.excessInterest,
    officeCode: opts.inpsOfficeCode,
    // Deferral surcharge on the interest row, as for the Gestione Separata: no source says it for these schemes (TODO).
    surchargeWithInterest: true,
  };
}

/** Deadlines of the year of `rules`: the four fixed installments, and balance and advances above the minimum with the income taxes. */
export function selfEmployedDeadlines(rules: FiscalRuleSet, kind: SelfEmployedKind, firstDate: string, secondDate: string, extensionSource?: string): Deadline[] {
  const p = params(rules);
  const r = selfEmployedReasons(rules, kind);
  const year = rules.year;
  const label = kind === 'ARTISANS' ? 'INPS Artigiani' : 'INPS Commercianti';
  const each = p.advancePct / p.advanceInstallments;
  return [
    ...p.fixedInstallmentDates.map((date, i) => deadline('INPS_FIXED_INSTALLMENT', date, `${label} installment ${i + 1} of 4 on the minimum income ${year}`, { taxYear: year, quarter: i + 1 }, r.fixed)),
    deadline('INPS_BALANCE', firstDate, `${label} balance above the minimum ${year - 1}`, { taxYear: year - 1, splittable: true }, r.excess, extensionSource),
    deadline('INPS_FIRST_ADVANCE', firstDate, `${label} first advance above the minimum ${year} (${each}%)`, { taxYear: year, percentage: each, splittable: true }, r.excess, extensionSource),
    deadline('INPS_SECOND_ADVANCE', secondDate, `${label} second advance above the minimum ${year} (${each}%)`, { taxYear: year, percentage: each, splittable: false }, r.excess),
  ];
}

/**
 * Reasons of the INPS section for Artigiani and Commercianti that the taxpayer can enter by hand (e.g. previous years
 * or payment notices), from the INPS sheet "F24 per artigiani e commercianti", with the deductible part (LM35): the
 * contributions of the year are deductible when paid; payment notices, settlements and installments may carry sanctions
 * and interest, so they are UNKNOWN (entered by hand in the year data). See other-entities.ts, ContributionDeduction.
 */
export const SELF_EMPLOYED_ROW_REASONS: ReadonlyArray<{ artisans: string; traders: string; description: string; deduction: 'YES' | 'UNKNOWN' }> = [
  { artisans: 'AF', traders: 'CF', description: 'Contributi dovuti sul minimale di reddito', deduction: 'YES' },
  { artisans: 'AP', traders: 'CP', description: 'Contributi eccedenti il minimale di reddito', deduction: 'YES' },
  { artisans: 'APR', traders: 'CPR', description: 'Pagamento rateale dei contributi eccedenti il minimale', deduction: 'YES' },
  { artisans: 'API', traders: 'CPI', description: 'Interessi della rateazione dei contributi eccedenti il minimale', deduction: 'UNKNOWN' },
  { artisans: 'AFP', traders: 'CFP', description: 'Contributi dovuti sul minimale di reddito anni pregressi', deduction: 'YES' },
  { artisans: 'APP', traders: 'CPP', description: 'Contributi dovuti sul reddito eccedente il minimale anni pregressi', deduction: 'YES' },
  { artisans: 'AR', traders: 'CR', description: 'Pagamento per intero dei debiti segnalati con avviso di pagamento', deduction: 'UNKNOWN' },
  { artisans: 'ARN', traders: 'CRN', description: 'Pagamento per intero dei debiti segnalati con avviso di pagamento', deduction: 'UNKNOWN' },
  { artisans: 'APMF', traders: 'CPMF', description: 'Debiti eccedenti il minimale a seguito di accertamento con adesione', deduction: 'UNKNOWN' },
  { artisans: 'AD', traders: 'CD', description: 'Pagamenti rateizzati a seguito di domanda di dilazione in fase amministrativa', deduction: 'UNKNOWN' },
];
