import { Module } from '@nestjs/common';
import { FiscalRulesController } from './fiscal-rules.controller.js';
import { FiscalRulesService } from './fiscal-rules.service.js';

@Module({
  controllers: [FiscalRulesController],
  providers: [FiscalRulesService],
  exports: [FiscalRulesService],
})
export class FiscalRulesModule {}
