import type { FiscalRuleSet } from './rule-set.js';
import { roundCents } from './rounding.js';

/**
 * Revenue thresholds of the flat-rate regime (L. 190/2014 art. 1 par. 54 and 71), on the collected
 * revenue of the year (cash basis).
 */

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
  const invoiceTotal = roundCents(input.invoiceTotal ?? 0);
  const outstanding = roundCents(input.outstanding);
  const projected = roundCents(input.collectedRevenue + outstanding + invoiceTotal);
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
