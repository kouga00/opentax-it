import { Module } from '@nestjs/common';
import type { ImportHandler } from '../common/import/import-handler.js';
import { InvoicesModule } from '../invoices/invoices.module.js';
import { InvoicesImportService } from '../invoices/services/invoices-import.service.js';
import { SdiModule } from '../sdi/sdi.module.js';
import { SdiReceiptsImportService } from '../sdi/services/sdi-receipts-import.service.js';
import { ImportsController } from './controllers/imports.controller.js';
import { DocumentImportService } from './services/document-import.service.js';
import { IMPORT_HANDLERS } from './types/import-handlers.token.js';

/** Registry of the import handlers, in the order they run: invoices before the receipts that refer to them. */
@Module({
  imports: [InvoicesModule, SdiModule],
  controllers: [ImportsController],
  providers: [
    DocumentImportService,
    {
      provide: IMPORT_HANDLERS,
      useFactory: (invoices: InvoicesImportService, receipts: SdiReceiptsImportService): ImportHandler[] => [invoices, receipts],
      inject: [InvoicesImportService, SdiReceiptsImportService],
    },
  ],
})
export class ImportsModule {}
