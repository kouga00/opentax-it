import type { F24Status } from '../../generated/prisma/enums.js';

/** A quarter of the stamp duty on e-invoices: the app's estimate, the AdE amount once saved, dates and payment. */
export interface StampDutyQuarter {
  year: number;
  quarter: number;
  taxCode: string;
  /** From the tenant's invoices with the virtual stamp. */
  estimatedAmount: number;
  /** The estimate counts invoices without an SDI delivery date. */
  estimated: boolean;
  /** The amount the AdE shows on the portal, saved with the F24 or the portal payment. */
  dueAmount: number | null;
  /** Payment deadline after the deferrals and the move to the next business day. */
  paymentDeadline: string;
  deferredFrom: string | null;
  listBChangesBy: string | null;
  amountAvailableOn: string | null;
  f24: { id: string; status: F24Status; paymentDate: string; paidOn: string | null } | null;
  /** Paid with the debit from the "Fatture e corrispettivi" portal. */
  paidOnPortal: string | null;
}
