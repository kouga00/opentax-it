import { type ContributionOptions, contributionScheme, type SocialSecuritySchemeId } from './contribution-schemes.js';
import type { SeparateSchemeContribution } from './inps-separate-scheme.js';
import type { FiscalRuleSet } from './rule-set.js';
import { computeSubstituteTax, type SubstituteTaxInput, type SubstituteTaxResult } from './substitute-tax.js';

/**
 * Yearly computation of a flat-rate taxpayer: the substitute tax (substitute-tax.ts) and the contributions
 * of the profile's scheme (contribution-schemes.ts), kept in separate modules and joined here. The two
 * points where they meet (both schemes computed today take the gross income LM34 as their base):
 * - the contributions paid in the year are deducted from the flat-rate income (LM35), whatever the
 *   scheme: an input of the substitute tax;
 * - the Gestione Separata contribution is computed on the gross income (LM34, Circ. INPS 62/2026 §2.2),
 *   an output of the substitute tax.
 * Sources in the header of each module.
 */

export interface TaxInput extends SubstituteTaxInput {
  /** Scheme of the profile; default: Gestione Separata. */
  contributionScheme?: SocialSecuritySchemeId;
  /** Gestione Separata: INPS rate to apply (full or reduced), percentage — RR5 col. 14. */
  inpsRatePct: number;
  /** Artigiani and Commercianti: flat-rate reduction and contributions before 1996. */
  contributionOptions?: Pick<ContributionOptions, 'flatRateReduction' | 'seniorityBefore1996'>;
}

export interface TaxResult extends SubstituteTaxResult, SeparateSchemeContribution {
  // inpsTaxableIncome/inpsContribution: the contribution on the income of the year (Artigiani and Commercianti: above the minimum).
  /** False when the scheme's contributions are not computed: the INPS amounts are 0. */
  contributionsComputed: boolean;
}

export function computeTaxes(rules: FiscalRuleSet, input: TaxInput): TaxResult {
  const tax = computeSubstituteTax(rules, input);
  const scheme = contributionScheme(input.contributionScheme ?? 'INPS_SEPARATE', rules);
  if (!scheme) return { ...tax, inpsTaxableIncome: 0, inpsContribution: 0, contributionsComputed: false };
  const opts = { ratePct: input.inpsRatePct, nextYearRatePct: input.inpsRatePct, ...input.contributionOptions };
  return { ...tax, ...scheme.computeContribution(rules, tax.grossIncome, opts), contributionsComputed: true };
}
