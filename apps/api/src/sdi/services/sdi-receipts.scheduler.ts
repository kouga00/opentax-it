import { Injectable, Logger } from '@nestjs/common';
import { Interval, Timeout } from '@nestjs/schedule';
import { SdiReceiptsSyncService } from './sdi-receipts-sync.service.js';

/** Every 10 minutes while the API runs: a choice of this app, SDI sets no polling interval for the PEC channel. */
const PERIOD_MS = 10 * 60_000;

/**
 * Reads the PEC mailboxes of the tenants with transmissions still waiting for an outcome (@nestjs/schedule): once
 * shortly after startup, to catch up with what arrived while the app was off, then periodically. Tenants are synced
 * one after the other; a failure is recorded on the tenant's mailbox state and does not stop the others.
 */
@Injectable()
export class SdiReceiptsScheduler {
  private readonly logger = new Logger(SdiReceiptsScheduler.name);

  constructor(private readonly receipts: SdiReceiptsSyncService) {}

  @Timeout(15_000)
  atStartup(): Promise<void> {
    return this.syncAwaiting();
  }

  @Interval(PERIOD_MS)
  periodically(): Promise<void> {
    return this.syncAwaiting();
  }

  private async syncAwaiting(): Promise<void> {
    try {
      for (const tenantId of await this.receipts.tenantsAwaitingReceipts()) await this.receipts.sync(tenantId);
    } catch (err) {
      this.logger.error(`Scheduled receipts sync failed: ${(err as Error).message}`);
    }
  }
}
