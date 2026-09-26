import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import type { InvoiceStatus } from '../../generated/prisma/enums.js';

/** Inside a transaction of the caller, so that the invoice changes together with the transmission. */
type Tx = Prisma.TransactionClient;

/**
 * Status changes of an issued invoice driven by its transmission to SDI (sdi module). The invoice status belongs
 * to this module: the sdi module asks for the change instead of writing it, and each method only acts on the
 * statuses it expects, so that concurrent or late events cannot move an invoice somewhere it should not go.
 */
@Injectable()
export class InvoiceStatusService {
  /** Imported invoices were issued and sent to SDI with another tool: they are never sent from here. */
  isImported(invoice: { imported: boolean }): boolean {
    return invoice.imported;
  }

  /** Issued → sent; false when another request claimed the invoice first. */
  async claimForSending(tx: Tx, tenantId: string, invoiceId: string): Promise<boolean> {
    const claimed = await tx.invoice.updateMany({ where: { id: invoiceId, tenantId, status: 'ISSUED' }, data: { status: 'SENT' } });
    return claimed.count === 1;
  }

  /** Sent → issued: the file never reached SDI, so the invoice can be sent again. */
  async reopen(tx: Tx, tenantId: string, invoiceId: string): Promise<void> {
    await tx.invoice.updateMany({ where: { id: invoiceId, tenantId, status: 'SENT' }, data: { status: 'ISSUED' } });
  }

  /** Outcome given by SDI (delivered, not delivered, rejected); a cancelled invoice stays cancelled. */
  async setSdiOutcome(tx: Tx, tenantId: string, invoiceId: string, status: Extract<InvoiceStatus, 'DELIVERED' | 'NOT_DELIVERED' | 'REJECTED'>): Promise<void> {
    await tx.invoice.updateMany({ where: { id: invoiceId, tenantId, status: { not: 'CANCELLED' } }, data: { status } });
  }
}
