import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { SdiTransmission } from '../../generated/prisma/client.js';
import { parseSdiDateTime } from '../../common/italian-date.js';
import { InvoiceStatusService } from '../../invoices/services/invoice-status.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { StorageService } from '../../storage/storage.service.js';
import type { SdiReceipt } from '@opentax-it/fatturapa';
import type { PecProviderReceipt } from '../types/pec-provider-receipt.js';
import type { SdiReceiptMessage } from '../types/sdi-receipt-message.js';
import { readPecMessage } from './pec-message-reader.js';
import type { Transition } from '../types/transition.js';
import { providerReceiptTransition, sdiReceiptTransition } from './transmission-transitions.js';

/**
 * Applies one message of the PEC mailbox to the transmissions: finds the transmission it refers to, records the
 * receipt once (SdiNotification.dedupeKey) and applies the transition (transmission-transitions.ts), asking the
 * invoices module for the invoice status. Reading the mailbox is SdiReceiptsSyncService's job.
 */

/**
 * Key against recording the same SDI receipt twice, from its content (type, IdentificativoSdI and MessageId), so that
 * a renamed copy or the same receipt from the mailbox and from the portal is still recognised.
 */
export const sdiReceiptKey = (r: SdiReceipt) => `sdi:${r.type}:${r.sdiId}:${r.messageId}`;

const isUniqueViolation = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

/** Receipt dates: SDI dateTime values through parseSdiDateTime, e-mail dates as they are; the time of reading if missing. */
const sdiDate = (value: string) => parseSdiDateTime(value) ?? new Date();
const mailDate = (value: string | undefined) => {
  const d = value ? new Date(value) : new Date();
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
    const receivedAt = mailDate(r.date);
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
      await this.applySdiReceipt(tenantId, t, fileName, xml, receipt);
    }
    if (!matched) return false;
    // The sender of SDI's replies is the address to use from now on (Allegato B 1.8.4 §3.1.1): learned once, from a
    // certified message carrying a receipt for one of our own files.
    await this.prisma.tenantProfile.updateMany({ where: { tenantId, sdiPecAssigned: null }, data: { sdiPecAssigned: m.sdiAddress } });
    return true;
  }

  /**
   * Records an SDI receipt (RC, NS, MC) for the transmission, stores its XML and moves transmission and invoice.
   * False when the same receipt was already recorded. Also used by the manual import of receipts.
   */
  async applySdiReceipt(tenantId: string, t: SdiTransmission, receiptFileName: string, xml: Buffer, receipt: SdiReceipt): Promise<boolean> {
    // Stored under the transmission and the content key of the receipt, never under the uploaded file name: different
    // receipts never share a path, and the same receipt read again finds its file already there (never rewritten).
    const safe = (v: string) => v.replace(/[^A-Za-z0-9._-]/g, '_');
    const rawPath = `${tenantId}/sdi/receipts/${t.id}/${safe(`${receipt.type}_${receipt.sdiId}_${receipt.messageId}`)}.xml`;
    await this.storage.write(rawPath, xml, { exclusive: true }).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'EEXIST') throw err;
    });
    return this.record(tenantId, t, {
      type: receipt.type,
      receivedAt: sdiDate(receipt.deliveredAt ?? receipt.receivedAt),
      sdiId: receipt.sdiId,
      fileName: receiptFileName,
      rawPath,
      dedupeKey: sdiReceiptKey(receipt),
      details: { receivedAt: receipt.receivedAt, deliveredAt: receipt.deliveredAt, availableOn: receipt.availableOn, errors: receipt.errors.map((e) => ({ ...e })), description: receipt.description },
    }, sdiReceiptTransition(t, receipt));
  }

  /** Records the receipt and applies the transition in one transaction; false when it was already recorded. */
  private async record(tenantId: string, t: SdiTransmission, notification: Omit<Prisma.SdiNotificationUncheckedCreateInput, 'transmissionId'>, transition: Transition | undefined): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.sdiNotification.create({ data: { ...notification, transmissionId: t.id } });
        if (!transition) return;
        await tx.sdiTransmission.update({ where: { id: t.id }, data: transition.transmission });
        if (transition.invoice === 'REOPEN') await this.invoiceStatus.reopen(tx, tenantId, t);
        else if (transition.invoice === 'CLAIM') await this.invoiceStatus.claimForSending(tx, tenantId, t);
        else if (transition.invoice) await this.invoiceStatus.setSdiOutcome(tx, tenantId, t, transition.invoice, transition.deliveredOn);
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      return false;
    }
    return true;
  }
}
