import type { PlanStartOption } from './plan-start-option.js';

/** First due dates allowed by the rule set of the payment year, for a tax year. */
export interface PlanOptions {
  taxYear: number;
  paymentYear: number;
  rulesYear: number;
  warnings: string[];
  starts: PlanStartOption[];
  secondAdvanceDate: string;
}
