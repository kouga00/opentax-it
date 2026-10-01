import { Module } from '@nestjs/common';
import { FiscalRulesModule } from '../fiscal-rules/fiscal-rules.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { TenantsModule } from '../tenants/tenants.module.js';
import { TaxesController } from './controllers/taxes.controller.js';
import { ReturnFilingService } from './services/return-filing.service.js';
import { ReturnGuideService } from './services/return-guide.service.js';
import { TaxesService } from './services/taxes.service.js';

@Module({ imports: [FiscalRulesModule, PaymentsModule, TenantsModule], controllers: [TaxesController], providers: [TaxesService, ReturnGuideService, ReturnFilingService], exports: [TaxesService] })
export class TaxesModule {}
