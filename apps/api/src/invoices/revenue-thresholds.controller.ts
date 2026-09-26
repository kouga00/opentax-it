import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { TenantId } from '../common/tenant.decorator.js';
import { ThresholdOutlookDto } from './dto/response/threshold-outlook.dto.js';
import { toThresholdOutlookDto } from './invoice.mapper.js';
import { InvoicesService } from './invoices.service.js';

/**
 * Collected revenue of the current year against the thresholds. It is about collections, not about one document:
 * hence its own resource. The computation stays in InvoicesService, which also checks a draft before issuing it.
 */
@Controller('revenue-thresholds')
export class RevenueThresholdsController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  @ApiOkResponse({ type: ThresholdOutlookDto })
  async current(@TenantId() tenantId: string): Promise<ThresholdOutlookDto> {
    return toThresholdOutlookDto(await this.service.thresholds(tenantId));
  }
}
