import type { AdvanceSchedule } from './advance-schedule.js';
import type { Deadline } from './deadline.js';
import type { F24SectionRows } from './f24-schedule.js';
import { computeSeparateSchemeContribution, inpsAdvance, separateSchemeDeadlines, separateSchemeF24Rows } from './inps-separate-scheme.js';
import {
  type FixedContribution,
  selfEmployedAdvance,
  selfEmployedDeadlines,
  selfEmployedExcessContribution,
  selfEmployedF24Rows,
  selfEmployedFixedContribution,
  type SelfEmployedKind,
} from './inps-self-employed.js';
import type { FiscalRuleSet } from './rule-set.js';

/**
 * Social security scheme of the taxpayer, chosen in the profile. Same values as the Prisma enum
 * `SocialSecurityScheme` (apps/api/prisma/schema.prisma): this package has no database types.
 * - INPS_SEPARATE: INPS Gestione Separata, for self-employed work without a professional register
 *   and fund (L. 335/1995 art. 2 par. 26; DL 98/2011 art. 18 par. 12: "esclusivamente i soggetti che
 *   svolgono attività il cui esercizio non sia subordinato all'iscrizione ad appositi albi professionali").
 * - INPS_ARTISANS, INPS_TRADERS: INPS Artigiani and Commercianti (business activities, L. 190/2014 par. 76).
 * - PROFESSIONAL_FUND: a professional fund ("cassa", D.Lgs. 509/1994 and 103/1996), e.g. Cassa Forense.
 */
export const SOCIAL_SECURITY_SCHEMES = ['INPS_SEPARATE', 'INPS_ARTISANS', 'INPS_TRADERS', 'PROFESSIONAL_FUND'] as const;
export type SocialSecuritySchemeId = (typeof SOCIAL_SECURITY_SCHEMES)[number];

/** What a scheme needs from the profile and the year data. */
export interface ContributionOptions {
  /** Gestione Separata: rate of the income year and of the following year (full or reduced). */
  ratePct: number;
  nextYearRatePct: number;
  /** Artigiani and Commercianti: flat-rate reduction of 35% requested (L. 190/2014 par. 77 and 83). */
  flatRateReduction?: boolean;
  /** Artigiani and Commercianti: contributions before 1996 (lower ceiling). */
  seniorityBefore1996?: boolean;
}

export interface ContributionF24Options {
  taxYear: number;
  inpsOfficeCode: string;
  single: boolean;
  /** Gestione Separata: 24% rate (P10/P10R). */
  reducedRate: boolean;
  /** Artigiani and Commercianti: INPS code of the contribution above the minimum, by year. */
  positionCodes?: Partial<Record<number, string>>;
}

/**
 * How the contributions of a scheme are computed and paid.
 *
 * Strategy pattern with a registry: every piece of the app that computes or pays contributions (tax summary, F24 plan,
 * deadlines, invoice surcharge) asks the registry for the scheme of the profile. Each scheme is a module of its own
 * (inps-separate-scheme.ts, inps-self-employed.ts). A scheme without an entry is not computed: the app shows a message
 * and the taxpayer enters the contributions by hand.
 */
export interface ContributionScheme {
  id: SocialSecuritySchemeId;
  /** False when `rules` lacks what the scheme needs (e.g. a rule set stored before the scheme's section existed). */
  available(rules: FiscalRuleSet): boolean;
  /** Contribution on the income of the year (RR): all of it for the Gestione Separata, the part above the minimum for Artigiani and Commercianti. */
  computeContribution(rules: FiscalRuleSet, grossIncome: number, opts: ContributionOptions): { inpsTaxableIncome: number; inpsContribution: number };
  /** Advances for the year of `nextRules`, from this year's income and contribution. */
  advance(nextRules: FiscalRuleSet, grossIncome: number, computed: { inpsTaxableIncome: number }, opts: ContributionOptions): AdvanceSchedule;
  /** INPS rows of balance and advances on the F24 forms of a tax year. */
  f24Rows(rules: FiscalRuleSet, opts: ContributionF24Options): F24SectionRows;
  /** INPS deadlines of the year of `rules`. */
  deadlines(rules: FiscalRuleSet, firstDate: string, secondDate: string, extensionSource?: string): Deadline[];
  /** Contribution due whatever the income, in fixed installments (Artigiani and Commercianti). */
  fixed?(rules: FiscalRuleSet, opts: ContributionOptions): FixedContribution;
  /**
   * The 4% INPS surcharge on invoices (TipoCassa TC22) is allowed. L. 662/1996 art. 1 par. 212 grants it
   * "Ai fini dell'obbligo previsto dall'articolo 2, comma 26, della legge 8 agosto 1995, n. 335", i.e.
   * only to those enrolled in the Gestione Separata.
   */
  inpsSurcharge: boolean;
}

const separate: ContributionScheme = {
  id: 'INPS_SEPARATE',
  available: () => true,
  computeContribution: (rules, grossIncome, opts) => computeSeparateSchemeContribution(rules, grossIncome, opts.ratePct),
  advance: (nextRules, _grossIncome, computed, opts) => inpsAdvance(nextRules, computed.inpsTaxableIncome, opts.nextYearRatePct),
  f24Rows: (rules, opts) => separateSchemeF24Rows(rules, opts),
  deadlines: separateSchemeDeadlines,
  inpsSurcharge: true,
};

function selfEmployed(id: 'INPS_ARTISANS' | 'INPS_TRADERS', kind: SelfEmployedKind): ContributionScheme {
  const options = (opts: ContributionOptions) => ({ kind, flatRateReduction: opts.flatRateReduction ?? false, seniorityBefore1996: opts.seniorityBefore1996 ?? false });
  return {
    id,
    available: (rules) => rules.inpsSelfEmployed !== undefined,
    computeContribution: (rules, grossIncome, opts) => selfEmployedExcessContribution(rules, grossIncome, options(opts)),
    advance: (nextRules, grossIncome, _computed, opts) => selfEmployedAdvance(nextRules, grossIncome, options(opts)),
    f24Rows: (rules, opts) => selfEmployedF24Rows(rules, { taxYear: opts.taxYear, kind, inpsOfficeCode: opts.inpsOfficeCode, single: opts.single, excessCodes: opts.positionCodes ?? {} }),
    deadlines: (rules, firstDate, secondDate, extensionSource) => selfEmployedDeadlines(rules, kind, firstDate, secondDate, extensionSource),
    fixed: (rules, opts) => selfEmployedFixedContribution(rules, options(opts)),
    inpsSurcharge: false,
  };
}

const CONTRIBUTION_SCHEMES: Partial<Record<SocialSecuritySchemeId, ContributionScheme>> = {
  INPS_SEPARATE: separate,
  INPS_ARTISANS: selfEmployed('INPS_ARTISANS', 'ARTISANS'),
  INPS_TRADERS: selfEmployed('INPS_TRADERS', 'TRADERS'),
};

/**
 * The scheme's computation, or undefined when OpenTax IT does not compute its contributions (professional funds), or
 * when the rule set lacks the scheme's section (Artigiani and Commercianti in rule sets stored before it existed).
 */
export function contributionScheme(id: SocialSecuritySchemeId, rules?: FiscalRuleSet): ContributionScheme | undefined {
  const scheme = CONTRIBUTION_SCHEMES[id];
  return scheme && (!rules || scheme.available(rules)) ? scheme : undefined;
}
