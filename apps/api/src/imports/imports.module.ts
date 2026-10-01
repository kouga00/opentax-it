import { Module } from '@nestjs/common';
import type { ImportHandler } from '../common/import/import-handler.js';
import { InvoicesModule } from '../invoices/invoices.module.js';
import { InvoicesImportService } from '../invoices/services/invoices-import.service.js';
import { SdiModule } from '../sdi/sdi.module.js';
import { SdiReceiptsImportService } from '../sdi/services/sdi-receipts-import.service.js';
import { ImportsController } from './controllers/imports.controller.js';
import { DocumentImportService } from './services/document-import.service.js';
import { IgnoredKindHandler } from './services/ignored-kind.handler.js';
import { IMPORT_HANDLERS } from './types/import-handlers.token.js';

/** Registry of the import handlers, in the order they run: invoices before the receipts that refer to them, then the kinds set aside. */
@Module({
  imports: [InvoicesModule, SdiModule],
  controllers: [ImportsController],
  providers: [
    DocumentImportService,
    {
      provide: IMPORT_HANDLERS,
      useFactory: (invoices: InvoicesImportService, receipts: SdiReceiptsImportService): ImportHandler[] => [
        invoices,
        receipts,
        new IgnoredKindHandler('SDI_METADATA', 'File di metadati SDI: non contiene la fattura'),
        new IgnoredKindHandler('SDI_MESSAGE', 'Messaggio SDI non gestito (riguarda le fatture verso la pubblica amministrazione)'),
      ],
      inject: [InvoicesImportService, SdiReceiptsImportService],
    },
  ],
})
export class ImportsModule {}
