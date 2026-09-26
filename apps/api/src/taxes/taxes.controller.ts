import { Body, Controller, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import { TenantId } from '../common/tenant.decorator.js';
import { UpdateTaxYearDataDto } from './taxes.dto.js';
import { TaxesService } from './taxes.service.js';

@Controller('taxes')
export class TaxesController {
  constructor(private readonly service: TaxesService) {}

  @Get(':year/summary')
  summary(@TenantId() tenantId: string, @Param('year', ParseIntPipe) year: number) { return this.service.summary(tenantId, year); }

  @Get(':year/data')
  data(@TenantId() tenantId: string, @Param('year', ParseIntPipe) year: number) { return this.service.yearData(tenantId, year); }

  @Put(':year/data')
  update(@TenantId() tenantId: string, @Param('year', ParseIntPipe) year: number, @Body() dto: UpdateTaxYearDataDto) {
    return this.service.updateYearData(tenantId, year, dto);
  }
}
