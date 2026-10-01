import { Module } from '@nestjs/common';
import { TaxCreditsController } from './controllers/tax-credits.controller.js';
import { TaxCreditsService } from './services/tax-credits.service.js';

@Module({ controllers: [TaxCreditsController], providers: [TaxCreditsService], exports: [TaxCreditsService] })
export class TaxCreditsModule {}
