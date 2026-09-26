import { Module } from '@nestjs/common';
import { TaxCreditsController } from './tax-credits.controller.js';
import { TaxCreditsService } from './tax-credits.service.js';

@Module({ controllers: [TaxCreditsController], providers: [TaxCreditsService], exports: [TaxCreditsService] })
export class TaxCreditsModule {}
