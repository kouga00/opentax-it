import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { SdiTransmission } from '../../generated/prisma/client.js';
import { InvoiceStatusService } from '../../invoices/services/invoice-status.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { StorageService } from '../../storage/storage.service.js';
import type { PecProviderReceipt, SdiReceiptMessage } from '../types/pec-inbound.js';
import { readPecMessage } from './pec-message-reader.js';
import { providerReceiptTransition, sdiReceiptTransition, type Transition } from './transmission-transitions.js';

/**
 * Applies one message of the PEC mailbox to the transmissions: finds the transmission it refers to, records the
 * receipt once (SdiNotification.dedupeKey) and applies the transition (transmission-transitions.ts), asking the
 * invoices module for the invoice status. Reading the mailbox is SdiReceiptsSyncService's job.
 */

const isUniqueViolation = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

/** SDI dates without a zone are Italian local time; parsed as they are, like the invoice dates. */
const toDate = (iso: string | undefined) => {
  const d = iso ? new Date(iso) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

@Injectable()
export class SdiReceiptsService {
  private readonly logger = new Logger(SdiReceiptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly invoiceStatus: InvoiceStatusService,
  ) {}

  /** True when the message concerned one of our transmissions. Database errors are thrown, so that the sync retries. */
  async apply(tenantId: string, source: Buffer): Promise<boolean> {
    let inbound;
    try {
      inbound = await readPecMessage(source);
    } catch (err) {
      // An unreadable message is skipped, not retried forever.
      this.logger.warn(`Unreadable PEC message skipped: ${(err as Error).message}`);
      return false;
    }
    if (inbound.kind === 'provider-receipt') return this.applyProviderReceipt(tenantId, inbound);
    if (inbound.kind === 'sdi-receipt') return this.applySdiReceipts(tenantId, inbound);
    return false;
  }

  private async applyProviderReceipt(tenantId: string, r: PecProviderReceipt): Promise<boolean> {
    const byMessageId = r.originalMessageId
      ? await this.prisma.sdiTransmission.findFirst({ where: { pecMessageId: r.originalMessageId, invoice: { tenantId } } })
      : null;
    // Fallback: our subject is the file name, and receipts repeat it ("ACCETTAZIONE: <subject>", §6.3.3).
    const t = byMessageId ?? (r.originalSubject
      ? await this.prisma.sdiTransmission.findFirst({ where: { fileName: r.originalSubject, invoice: { tenantId } }, orderBy: { createdAt: 'desc' } })
      : null);
    if (!t) return false;
    const receivedAt = toDate(r.date);
    await this.record(tenantId, t, {
      type: `PEC_${r.type.toUpperCase().replace(/-/g, '_')}`,
      receivedAt,
      dedupeKey: `pec:${r.type}:${r.providerId ?? r.date ?? ''}`,
      details: { providerId: r.providerId, error: r.error },
    }, providerReceiptTransition(t, r, receivedAt));
    return true;
  }

  private async applySdiReceipts(tenantId: string, m: SdiReceiptMessage): Promise<boolean> {
    let matched = false;
    for (const { fileName, xml, receipt } of m.receipts) {
      const t = await this.prisma.sdiTransmission.findFirst({ where: { fileName: receipt.fileName, invoice: { tenantId } }, orderBy: { createdAt: 'desc' } });
      if (!t) continue;
      matched = true;
      const rawPath = await this.storage.write(`${tenantId}/sdi/receipts/${fileName.replace(/[^A-Za-z0-9._-]/g, '_')}`, xml);
      await this.record(tenantId, t, {
        type: receipt.type,
        receivedAt: toDate(receipt.deliveredAt ?? receipt.receivedAt),
        sdiId: receipt.sdiId,
        fileName,
        rawPath,
        dedupeKey: `sdi:${fileName}`,
        details: { receivedAt: receipt.receivedAt, deliveredAt: receipt.deliveredAt, errors: receipt.errors.map((e) => ({ ...e })), description: receipt.description },
      }, sdiReceiptTransition(receipt));
    }
    if (!matched) return false;
    // The sender of SDI's replies is the address to use from now on (Allegato B 1.8.4 §3.1.1): learned once, from a
    // certified message carrying a receipt for one of our own files.
    await this.prisma.tenantProfile.updateMany({ where: { tenantId, sdiPecAssigned: null }, data: { sdiPecAssigned: m.sdiAddress } });
    return true;
  }

  /** Records the receipt and applies the transition in one transaction; a receipt already recorded changes nothing. */
  private async record(tenantId: string, t: SdiTransmission, notification: Omit<Prisma.SdiNotificationUncheckedCreateInput, 'transmissionId'>, transition: Transition | undefined): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.sdiNotification.create({ data: { ...notification, transmissionId: t.id } });
        if (!transition) return;
        await tx.sdiTransmission.update({ where: { id: t.id }, data: transition.transmission });
        if (transition.invoice === 'REOPEN') await this.invoiceStatus.reopen(tx, tenantId, t.invoiceId);
        else if (transition.invoice === 'DELIVERED' || transition.invoice === 'NOT_DELIVERED' || transition.invoice === 'REJECTED') await this.invoiceStatus.setSdiOutcome(tx, tenantId, t.invoiceId, transition.invoice);
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
  }
}
