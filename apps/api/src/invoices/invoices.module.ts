import { Module } from '@nestjs/common';
import { FiscalRulesModule } from '../fiscal-rules/fiscal-rules.module.js';
import { TenantsModule } from '../tenants/tenants.module.js';
import { InvoiceFilesController } from './controllers/invoice-files.controller.js';
import { InvoiceImportController } from './controllers/invoice-import.controller.js';
import { InvoicesController } from './controllers/invoices.controller.js';
import { RevenueThresholdsController } from './controllers/revenue-thresholds.controller.js';
import { InvoicesImportService } from './services/invoices-import.service.js';
import { InvoicesPdfService } from './services/invoices-pdf.service.js';
import { InvoicesService } from './services/invoices.service.js';

@Module({ imports: [FiscalRulesModule, TenantsModule], controllers: [InvoiceImportController, InvoiceFilesController, RevenueThresholdsController, InvoicesController], providers: [InvoicesService, InvoicesImportService, InvoicesPdfService] })
export class InvoicesModule {}
