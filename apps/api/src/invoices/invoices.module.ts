import { Module } from '@nestjs/common';
import { FiscalRulesModule } from '../fiscal-rules/fiscal-rules.module.js';
import { TenantsModule } from '../tenants/tenants.module.js';
import { InvoiceFilesController } from './controllers/invoice-files.controller.js';
import { InvoicesController } from './controllers/invoices.controller.js';
import { RevenueThresholdsController } from './controllers/revenue-thresholds.controller.js';
import { InvoicesImportService } from './services/invoices-import.service.js';
import { InvoicesPdfService } from './services/invoices-pdf.service.js';
import { InvoiceStatusService } from './services/invoice-status.service.js';
import { InvoicesService } from './services/invoices.service.js';

@Module({ imports: [FiscalRulesModule, TenantsModule], controllers: [InvoiceFilesController, RevenueThresholdsController, InvoicesController], providers: [InvoicesService, InvoicesImportService, InvoicesPdfService, InvoiceStatusService], exports: [InvoicesService, InvoiceStatusService, InvoicesImportService] })
export class InvoicesModule {}
