import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import type { InvoiceStatus } from '../../generated/prisma/enums.js';
import type { InvoiceFile } from '../types/invoice-file.js';

/** Inside a transaction of the caller, so that the invoice changes together with the transmission. */
type Tx = Prisma.TransactionClient;

/**
 * Status changes of an issued invoice driven by its transmission to SDI (sdi module). The invoice status belongs
 * to this module: the sdi module asks for the change instead of writing it, and each method only acts on the
 * statuses it expects, so that concurrent or late events cannot move an invoice somewhere it should not go.
 *
 * Each change names the file it comes from and applies only while that file is still the invoice's own: after a
 * rejection the invoice is sent again under a new file name (Circ. AdE 13/E/2018 §1.6), and a late event about the
 * old file must not touch it.
 */
@Injectable()
export class InvoiceStatusService {
  /** Imported invoices were issued and sent to SDI with another tool: they are never sent from here. */
  isImported(invoice: { imported: boolean }): boolean {
    return invoice.imported;
  }

  /** Issued → sent; false when another request claimed the invoice first. */
  async claimForSending(tx: Tx, tenantId: string, file: InvoiceFile): Promise<boolean> {
    const claimed = await tx.invoice.updateMany({ where: { ...current(tenantId, file), status: 'ISSUED' }, data: { status: 'SENT' } });
    return claimed.count === 1;
  }

  /** Sent → issued: the file never reached SDI, so the invoice can be sent again. */
  async reopen(tx: Tx, tenantId: string, file: InvoiceFile): Promise<void> {
    await tx.invoice.updateMany({ where: { ...current(tenantId, file), status: 'SENT' }, data: { status: 'ISSUED' } });
  }

  /**
   * Outcome given by SDI (delivered, not delivered, rejected), with the day of delivery or of availability when the
   * receipt gives one; a cancelled invoice stays cancelled.
   */
  async setSdiOutcome(tx: Tx, tenantId: string, file: InvoiceFile, status: Extract<InvoiceStatus, 'DELIVERED' | 'NOT_DELIVERED' | 'REJECTED'>, deliveredOn?: string): Promise<void> {
    await tx.invoice.updateMany({
      where: { ...current(tenantId, file), status: { not: 'CANCELLED' } },
      data: { status, sdiDeliveredOn: deliveredOn ? new Date(`${deliveredOn}T00:00:00Z`) : null },
    });
  }
}

const current = (tenantId: string, file: InvoiceFile) => ({ id: file.invoiceId, tenantId, xmlFileName: file.fileName });
