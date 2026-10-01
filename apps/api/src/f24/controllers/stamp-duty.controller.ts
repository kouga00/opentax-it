import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/tenant.decorator.js';
import { CreateStampDutyF24Dto } from '../dto/request/create-stamp-duty-f24.dto.js';
import { StampDutyPaymentDto } from '../dto/request/stamp-duty-payment.dto.js';
import { F24Dto } from '../dto/response/f24.dto.js';
import { StampDutyQuarterDto } from '../dto/response/stamp-duty-quarter.dto.js';
import { toSavedF24Dto } from '../mappers/f24.mapper.js';
import { toStampDutyQuarterDto } from '../mappers/stamp-duty.mapper.js';
import { StampDutyService } from '../services/stamp-duty.service.js';

/** Stamp duty on e-invoices by quarter: estimate, amount of the AdE, payment with F24 or from the portal. */
@ApiTags('Bollo')
@Controller('stamp-duty')
export class StampDutyController {
  constructor(private readonly service: StampDutyService) {}

  @ApiOperation({ summary: "Trimestri del bollo sulle fatture elettroniche di un anno" })
  @Get()
  @ApiOkResponse({ type: [StampDutyQuarterDto] })
  async list(@TenantId() tenantId: string, @Query('year', ParseIntPipe) year: number): Promise<StampDutyQuarterDto[]> {
    return (await this.service.list(tenantId, year)).map(toStampDutyQuarterDto);
  }

  @ApiOperation({ summary: "Modello F24 del bollo di un trimestre, con l'importo dell'Agenzia delle Entrate" })
  @Post(':year/:quarter/f24')
  @ApiCreatedResponse({ type: F24Dto })
  async createF24(
    @TenantId() tenantId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('quarter', ParseIntPipe) quarter: number,
    @Body() dto: CreateStampDutyF24Dto,
  ): Promise<F24Dto> {
    return toSavedF24Dto(await this.service.createF24(tenantId, year, quarter, dto));
  }

  @ApiOperation({ summary: 'Segna il bollo di un trimestre come pagato dal portale Fatture e corrispettivi' })
  @Put(':year/:quarter/payment')
  @ApiOkResponse({ type: StampDutyQuarterDto })
  async markPaid(
    @TenantId() tenantId: string,
    @Param('year', ParseIntPipe) year: number,
    @Param('quarter', ParseIntPipe) quarter: number,
    @Body() dto: StampDutyPaymentDto,
  ): Promise<StampDutyQuarterDto> {
    return toStampDutyQuarterDto(await this.service.markPaidOnPortal(tenantId, year, quarter, dto));
  }

  @ApiOperation({ summary: 'Annulla il pagamento dal portale di un trimestre' })
  @Delete(':year/:quarter/payment')
  @HttpCode(204)
  @ApiNoContentResponse()
  async unmarkPaid(@TenantId() tenantId: string, @Param('year', ParseIntPipe) year: number, @Param('quarter', ParseIntPipe) quarter: number): Promise<void> {
    await this.service.unmarkPaidOnPortal(tenantId, year, quarter);
  }
}
