import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ReceiptsSyncResult } from '../types/receipts-sync-result.js';
import { pecErrorMessage } from './pec-errors.js';
import { PecImapService } from './pec-imap.service.js';
import { PecSettingsService } from './pec-settings.service.js';
import { SdiReceiptsService } from './sdi-receipts.service.js';
import { AWAITING_OUTCOME } from './transmission-statuses.js';

/**
 * Reconciliation of SDI transmissions with the PEC mailbox. Receipts are not lost while the app is off: SDI sends
 * them "sullo stesso canale attraverso il quale sono state trasmesse le relative fatture" (Spec. 1.9.1 §1.5.7), so
 * they wait in the mailbox. A sync reads the inbox from the saved UID (PecMailboxState), hands each message to
 * SdiReceiptsService and saves the UID after it, so that a failure resumes from there.
 *
 * Runs at startup, periodically while there are transmissions without an outcome (SdiReceiptsScheduler) and on
 * demand ("Controlla ricevute"); one sync at a time per tenant.
 */

/** A sync that has not handled a message for this long is considered crashed and its lock is taken over. */
const STALE_LOCK_MS = 15 * 60_000;

/** Errors of our own storage, not of the mailbox: the user gets a generic message instead of an IMAP one. */
const isDatabaseError = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError || err instanceof Prisma.PrismaClientUnknownRequestError || err instanceof Prisma.PrismaClientValidationError;

@Injectable()
export class SdiReceiptsSyncService {
  private readonly logger = new Logger(SdiReceiptsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: PecSettingsService,
    private readonly imap: PecImapService,
    private readonly receipts: SdiReceiptsService,
  ) {}

  async sync(tenantId: string): Promise<ReceiptsSyncResult> {
    await this.prisma.pecMailboxState.upsert({ where: { tenantId }, create: { tenantId }, update: {} });
    const claimed = await this.prisma.pecMailboxState.updateMany({
      where: { tenantId, OR: [{ syncStartedAt: null }, { syncStartedAt: { lt: new Date(Date.now() - STALE_LOCK_MS) } }] },
      data: { syncStartedAt: new Date() },
    });
    if (claimed.count === 0) return { status: 'BUSY', read: 0, matched: 0 };

    let read = 0;
    let matched = 0;
    try {
      let connection;
      try {
        connection = await this.settings.connection(tenantId);
      } catch (err) {
        if (!(err instanceof HttpException)) throw err;
        return { status: 'NOT_CONFIGURED', read, matched, message: err.message };
      }
      const state = await this.prisma.pecMailboxState.findUniqueOrThrow({ where: { tenantId } });
      const cursor = { uidValidity: state.uidValidity ?? undefined, lastUid: state.lastUid ?? undefined, since: await this.rescanFrom(tenantId) };
      const end = await this.imap.readInbox(connection, cursor, async ({ uidValidity, uid, source }) => {
        read += 1;
        if (await this.receipts.apply(tenantId, source)) matched += 1;
        // Saved after each message, never backwards, and it keeps the lock alive (syncStartedAt as a heartbeat).
        await this.prisma.pecMailboxState.updateMany({ where: { tenantId, OR: [{ lastUid: null }, { lastUid: { lt: uid } }, { uidValidity: { not: uidValidity } }] }, data: { uidValidity, lastUid: uid } });
        await this.prisma.pecMailboxState.update({ where: { tenantId }, data: { syncStartedAt: new Date() } });
      });
      await this.prisma.pecMailboxState.update({ where: { tenantId }, data: { uidValidity: end.uidValidity, lastUid: end.lastUid, lastSyncAt: new Date(), lastError: null } });
      return { status: 'DONE', read, matched };
    } catch (err) {
      const message = isDatabaseError(err) ? 'Errore interno durante la registrazione delle ricevute: riprova più tardi.' : pecErrorMessage(err, 'IMAP');
      this.logger.warn(`Receipts sync of tenant ${tenantId} failed: ${(err as { code?: string }).code ?? (err as Error).name}`);
      await this.prisma.pecMailboxState.update({ where: { tenantId }, data: { lastError: message } });
      return { status: 'ERROR', read, matched, message };
    } finally {
      await this.prisma.pecMailboxState.update({ where: { tenantId }, data: { syncStartedAt: null } });
    }
  }

  /**
   * Tenants with a PEC mailbox and PEC transmissions still waiting for an outcome: the only ones worth a periodic
   * login. Transmissions made with another tool get their outcome from uploaded receipts, not from the mailbox.
   */
  async tenantsAwaitingReceipts(): Promise<string[]> {
    const rows = await this.prisma.sdiTransmission.findMany({
      where: { channel: 'PEC', status: { in: AWAITING_OUTCOME }, invoice: { tenant: { profile: { pecPasswordEnc: { not: null } } } } },
      select: { invoice: { select: { tenantId: true } } },
    });
    return [...new Set(rows.map((r) => r.invoice.tenantId))];
  }

  /**
   * Date to search the inbox from when the saved UIDs cannot be used (first sync, or UIDVALIDITY changed): the day
   * before the oldest transmission still waiting for an outcome. Without such transmissions there is nothing to find.
   */
  private async rescanFrom(tenantId: string): Promise<Date | undefined> {
    const oldest = await this.prisma.sdiTransmission.findFirst({
      where: { invoice: { tenantId }, channel: 'PEC', status: { in: AWAITING_OUTCOME } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });
    return oldest ? new Date(oldest.createdAt.getTime() - 86_400_000) : undefined;
  }
}
