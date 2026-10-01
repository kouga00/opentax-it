import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuditLogModule } from './audit-log/audit-log.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthGuard } from './common/auth.guard.js';
import { RolesGuard } from './common/roles.guard.js';
import { CustomersModule } from './customers/customers.module.js';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module.js';
import { F24Module } from './f24/f24.module.js';
import { FiscalRulesModule } from './fiscal-rules/fiscal-rules.module.js';
import { ImportsModule } from './imports/imports.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SdiModule } from './sdi/sdi.module.js';
import { SourcesModule } from './sources/sources.module.js';
import { StorageModule } from './storage/storage.module.js';
import { TaxCreditsModule } from './tax-credits/tax-credits.module.js';
import { TaxesModule } from './taxes/taxes.module.js';
import { TenantsModule } from './tenants/tenants.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot({
      errorMessage: 'Troppi tentativi. Riprova più tardi.',
      throttlers: [
        {
          name: 'default',
          ttl: 15 * 60_000,
          limit: 5,
        },
        {
          // Rate limit per email: 20 attempts per hour on auth endpoints.
          // This is a trade-off: a tighter limit (e.g. 5/15min) allows malicious third parties
          // to easily cause a Denial-of-Service / lockout against a legitimate user's email address.
          name: 'auth-email',
          ttl: 60 * 60_000,
          limit: 20,
          skipIf: (ctx) => !ctx.switchToHttp().getRequest().body?.email,
          getTracker: (req) => {
            const email = (req as { body?: { email?: unknown } }).body?.email;
            return typeof email === 'string' && email.trim()
              ? `email:${email.trim().toLowerCase()}`
              : (req.ip ?? 'unknown');
          },
        },
      ],
    }),
    PrismaModule,
    AuditLogModule,
    AuthModule,
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
    ImportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
