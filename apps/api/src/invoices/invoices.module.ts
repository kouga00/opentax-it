import { Module } from '@nestjs/common';
import { FiscalRulesModule } from '../fiscal-rules/fiscal-rules.module.js';
import { TenantsModule } from '../tenants/tenants.module.js';
import { InvoiceFilesController } from './invoice-files.controller.js';
import { InvoiceImportController } from './invoice-import.controller.js';
import { InvoicesController } from './invoices.controller.js';
import { RevenueThresholdsController } from './revenue-thresholds.controller.js';
import { InvoicesImportService } from './invoices-import.service.js';
import { InvoicesPdfService } from './invoices-pdf.service.js';
import { InvoicesService } from './invoices.service.js';

@Module({ imports: [FiscalRulesModule, TenantsModule], controllers: [InvoiceImportController, InvoiceFilesController, RevenueThresholdsController, InvoicesController], providers: [InvoicesService, InvoicesImportService, InvoicesPdfService] })
export class InvoicesModule {}
