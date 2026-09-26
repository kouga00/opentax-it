import type { InvoiceStatus } from '../generated/prisma/enums.js';

/**
 * When an invoice counts as issued. An electronic invoice is issued when SDI delivers it (RC) or makes it available
 * to the customer (MC); after a rejection (NS) "la fattura elettronica [...] si considera non emessa" (Spec. FatturaPA
 * 1.9.1 §1.6). Invoices imported from the AdE portal or from another tool went through SDI already and count as
 * issued until their receipts are imported. Shared by the modules that total or schedule invoices.
 */

const ISSUED_STATUSES: InvoiceStatus[] = ['DELIVERED', 'NOT_DELIVERED'];

export function isIssued(invoice: { status: InvoiceStatus; imported: boolean }): boolean {
  return ISSUED_STATUSES.includes(invoice.status) || (invoice.imported && invoice.status === 'ISSUED');
}

/** The same rule as a Prisma filter on invoices. */
export const ISSUED_WHERE = { OR: [{ status: { in: ISSUED_STATUSES } }, { imported: true, status: 'ISSUED' as InvoiceStatus }] };

/**
 * Statuses left out of estimates that also count invoices not issued yet (revenue projection, stamp duty and
 * Intrastat schedules): drafts, cancelled invoices and rejected ones, which were never issued and must be
 * corrected and sent again.
 */
export const NEVER_ISSUED: InvoiceStatus[] = ['DRAFT', 'CANCELLED', 'REJECTED'];
