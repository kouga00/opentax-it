import { Module } from '@nestjs/common';
import { FiscalRulesModule } from '../fiscal-rules/fiscal-rules.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { TaxCreditsModule } from '../tax-credits/tax-credits.module.js';
import { TaxesModule } from '../taxes/taxes.module.js';
import { TenantsModule } from '../tenants/tenants.module.js';
import { F24Controller } from './controllers/f24.controller.js';
import { InstallmentPlansController } from './controllers/installment-plans.controller.js';
import { StampDutyController } from './controllers/stamp-duty.controller.js';
import { ContributionF24Service } from './services/contribution-f24.service.js';
import { F24PdfService } from './services/f24-pdf.service.js';
import { F24TelematicFileService } from './services/f24-telematic-file.service.js';
import { F24Service } from './services/f24.service.js';
import { StampDutyService } from './services/stamp-duty.service.js';

@Module({ imports: [FiscalRulesModule, TaxesModule, TaxCreditsModule, TenantsModule, StorageModule], controllers: [F24Controller, InstallmentPlansController, StampDutyController], providers: [F24Service, F24PdfService, F24TelematicFileService, ContributionF24Service, StampDutyService] })
export class F24Module {}
