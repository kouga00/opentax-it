import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/tenant.decorator.js';
import { SaveTaxCreditDto } from '../dto/request/save-tax-credit.dto.js';
import { TaxCreditDto } from '../dto/response/tax-credit.dto.js';
import { toTaxCreditDto } from '../mappers/tax-credits.mapper.js';
import { TaxCreditsService } from '../services/tax-credits.service.js';

/** Tax credits usable in F24 (Redditi PF instructions, booklet 1 §8 "La compensazione"). */
@ApiTags('Crediti d\'imposta')
@Controller('tax-credits')
export class TaxCreditsController {
  constructor(private readonly service: TaxCreditsService) {}

  @ApiOperation({ summary: 'Elenco dei crediti' })
  @Get()
  @ApiOkResponse({ type: [TaxCreditDto] })
  async list(@TenantId() tenantId: string): Promise<TaxCreditDto[]> {
    return (await this.service.list(tenantId)).map(toTaxCreditDto);
  }

  @ApiOperation({ summary: 'Un credito, con quanto è già stato usato negli F24' })
  @Get(':id')
  @ApiOkResponse({ type: TaxCreditDto })
  async get(@TenantId() tenantId: string, @Param('id') id: string): Promise<TaxCreditDto> {
    return toTaxCreditDto(await this.service.get(tenantId, id));
  }

  @ApiOperation({ summary: 'Registra un credito' })
  @Post()
  @ApiCreatedResponse({ type: TaxCreditDto })
  async create(@TenantId() tenantId: string, @Body() dto: SaveTaxCreditDto): Promise<TaxCreditDto> {
    return toTaxCreditDto(await this.service.create(tenantId, dto));
  }

  @ApiOperation({ summary: 'Sostituisce un credito' })
  @Put(':id')
  @ApiOkResponse({ type: TaxCreditDto })
  async update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: SaveTaxCreditDto): Promise<TaxCreditDto> {
    return toTaxCreditDto(await this.service.update(tenantId, id, dto));
  }

  @ApiOperation({ summary: 'Elimina un credito' })
  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@TenantId() tenantId: string, @Param('id') id: string): Promise<void> {
    return this.service.remove(tenantId, id);
  }
}
