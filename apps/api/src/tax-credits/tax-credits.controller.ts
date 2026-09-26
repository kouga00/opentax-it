import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from '@nestjs/swagger';
import { TenantId } from '../common/tenant.decorator.js';
import { SaveTaxCreditDto } from './dto/request/save-tax-credit.dto.js';
import { TaxCreditDto } from './dto/response/tax-credit.dto.js';
import { toTaxCreditDto } from './tax-credits.mapper.js';
import { TaxCreditsService } from './tax-credits.service.js';

/** Tax credits usable in F24 (Redditi PF instructions, booklet 1 §8 "La compensazione"). */
@Controller('tax-credits')
export class TaxCreditsController {
  constructor(private readonly service: TaxCreditsService) {}

  @Get()
  @ApiOkResponse({ type: [TaxCreditDto] })
  async list(@TenantId() tenantId: string): Promise<TaxCreditDto[]> {
    return (await this.service.list(tenantId)).map(toTaxCreditDto);
  }

  @Get(':id')
  @ApiOkResponse({ type: TaxCreditDto })
  async get(@TenantId() tenantId: string, @Param('id') id: string): Promise<TaxCreditDto> {
    return toTaxCreditDto(await this.service.get(tenantId, id));
  }

  @Post()
  @ApiCreatedResponse({ type: TaxCreditDto })
  async create(@TenantId() tenantId: string, @Body() dto: SaveTaxCreditDto): Promise<TaxCreditDto> {
    return toTaxCreditDto(await this.service.create(tenantId, dto));
  }

  @Put(':id')
  @ApiOkResponse({ type: TaxCreditDto })
  async update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: SaveTaxCreditDto): Promise<TaxCreditDto> {
    return toTaxCreditDto(await this.service.update(tenantId, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@TenantId() tenantId: string, @Param('id') id: string): Promise<void> {
    return this.service.remove(tenantId, id);
  }
}
