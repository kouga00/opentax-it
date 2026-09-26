import type { F24Draft, PaymentScheduleAmounts } from '@opentax-it/fiscal-rules';
import type { CompensationOrder } from './compensation-order.js';
import type { PlanStart } from './plan-start.js';

/** A computed form: dates as YYYY-MM-DD, the payment date moved to the next business day. */
export type PlannedForm = Omit<F24Draft, 'paymentDate' | 'i24CancelBy'> & { paymentDate: string; nominalPaymentDate: string; i24CancelBy: string };

/** Forms that an installment plan with the given choices would produce, and the amounts behind them. */
export interface PlanPreview {
  taxYear: number;
  paymentYear: number;
  rulesYear: number;
  ruleSetVersion: number | null;
  start: PlanStart;
  firstDueDate: string;
  surchargePct: number;
  installments: number;
  maxInstallments: number;
  /** Amounts due from the return, before credits. */
  due: PaymentScheduleAmounts;
  /** Amounts split into the forms, after credits. */
  amounts: PaymentScheduleAmounts;
  credits: { tax: number; inps: number };
  compensation: { used: number; unused: number; order: CompensationOrder; usages: Array<{ creditId: string; amount: number }> };
  inpsOfficeCode: string;
  forms: PlannedForm[];
  warnings: string[];
}
