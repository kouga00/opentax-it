import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CustomersModule } from './customers/customers.module.js';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module.js';
import { F24Module } from './f24/f24.module.js';
import { FiscalRulesModule } from './fiscal-rules/fiscal-rules.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { TaxCreditsModule } from './tax-credits/tax-credits.module.js';
import { TaxesModule } from './taxes/taxes.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SdiModule } from './sdi/sdi.module.js';
import { SourcesModule } from './sources/sources.module.js';
import { StorageModule } from './storage/storage.module.js';
import { TenantsModule } from './tenants/tenants.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    StorageModule,
    FiscalRulesModule,
    TenantsModule,
    CustomersModule,
    InvoicesModule,
    PaymentsModule,
    TaxesModule,
    TaxCreditsModule,
    F24Module,
    ExchangeRatesModule,
    SourcesModule,
    SdiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
