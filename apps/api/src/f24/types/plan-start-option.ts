import type { PlanStart } from './plan-start.js';

/** A first due date offered by the payment year's rule set, with the installments it allows. */
export interface PlanStartOption {
  start: PlanStart;
  date: string;
  surchargePct: number;
  maxInstallments: number;
  source?: string;
}
