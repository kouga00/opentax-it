import { Module } from '@nestjs/common';
import { InvoicesModule } from '../invoices/invoices.module.js';
import { PecSettingsController } from './controllers/pec-settings.controller.js';
import { SdiReceiptsController } from './controllers/sdi-receipts.controller.js';
import { SdiTransmissionsController } from './controllers/sdi-transmissions.controller.js';
import { PecConnectionTestService } from './services/pec-connection-test.service.js';
import { PecImapService } from './services/pec-imap.service.js';
import { PecSettingsService } from './services/pec-settings.service.js';
import { PecSmtpService } from './services/pec-smtp.service.js';
import { SdiReceiptsImportService } from './services/sdi-receipts-import.service.js';
import { SdiReceiptsSyncService } from './services/sdi-receipts-sync.service.js';
import { SdiReceiptsScheduler } from './services/sdi-receipts.scheduler.js';
import { SdiReceiptsService } from './services/sdi-receipts.service.js';
import { SdiTransmissionsService } from './services/sdi-transmissions.service.js';

/**
 * Transmission of invoices to SDI through the PEC channel: mailbox settings and test, sending, and reading the
 * receipts. The invoice status is changed through the invoices module (InvoiceStatusService).
 */
@Module({
  imports: [InvoicesModule],
  controllers: [PecSettingsController, SdiTransmissionsController, SdiReceiptsController],
  providers: [
    PecSettingsService, PecConnectionTestService, PecSmtpService, PecImapService,
    SdiTransmissionsService, SdiReceiptsService, SdiReceiptsSyncService, SdiReceiptsScheduler, SdiReceiptsImportService,
  ],
  exports: [SdiReceiptsImportService],
})
export class SdiModule {}
