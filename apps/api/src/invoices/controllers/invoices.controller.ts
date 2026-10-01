import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/tenant.decorator.js';
import { IssueInvoiceDto } from '../dto/request/issue-invoice.dto.js';
import { ListInvoicesQueryDto } from '../dto/request/list-invoices-query.dto.js';
import { SaveInvoiceDto } from '../dto/request/save-invoice.dto.js';
import { InvoiceDetailDto } from '../dto/response/invoice-detail.dto.js';
import { InvoiceListItemDto } from '../dto/response/invoice-list-item.dto.js';
import { InvoicePaymentPlanDto } from '../dto/response/invoice-payment-plan.dto.js';
import { ThresholdOutlookDto } from '../dto/response/threshold-outlook.dto.js';
import { toInvoiceDetailDto, toInvoiceListItemDto, toInvoicePaymentPlanDto, toThresholdOutlookDto } from '../mappers/invoice.mapper.js';
import { InvoicesService } from '../services/invoices.service.js';

/**
 * Documents and their life cycle: drafts, issue, deletion. Import, files (XML, PDF) and the revenue thresholds of
 * the year have their own controllers.
 */
@ApiTags('Fatture')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  /** Years that have at least one invoice (declared before ':id' routes). */
  @ApiOperation({ summary: 'Anni con almeno un documento' })
  @Get('years')
  @ApiOkResponse({ type: [Number] })
  years(@TenantId() tenantId: string): Promise<number[]> {
    return this.service.years(tenantId);
  }

  @ApiOperation({ summary: 'Documenti dell\'anno' })
  @Get()
  @ApiOkResponse({ type: [InvoiceListItemDto] })
  async list(@TenantId() tenantId: string, @Query() q: ListInvoicesQueryDto): Promise<InvoiceListItemDto[]> {
    return (await this.service.list(tenantId, q)).map(toInvoiceListItemDto);
  }

  @ApiOperation({ summary: 'Un documento con le righe' })
  @Get(':id')
  @ApiOkResponse({ type: InvoiceDetailDto })
  async get(@TenantId() tenantId: string, @Param('id') id: string): Promise<InvoiceDetailDto> {
    return toInvoiceDetailDto(await this.service.get(tenantId, id));
  }

  @ApiOperation({ summary: 'Crea una bozza' })
  @Post()
  @ApiCreatedResponse({ type: InvoiceDetailDto })
  async create(@TenantId() tenantId: string, @Body() dto: SaveInvoiceDto): Promise<InvoiceDetailDto> {
    return toInvoiceDetailDto(await this.service.create(tenantId, dto));
  }

  /** Replaces a draft: issued documents cannot be changed. */
  @ApiOperation({ summary: 'Sostituisce una bozza' })
  @Put(':id')
  @ApiOkResponse({ type: InvoiceDetailDto })
  async update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: SaveInvoiceDto): Promise<InvoiceDetailDto> {
    return toInvoiceDetailDto(await this.service.update(tenantId, id, dto));
  }

  @ApiOperation({ summary: 'Elimina una bozza' })
  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@TenantId() tenantId: string, @Param('id') id: string): Promise<void> {
    return this.service.remove(tenantId, id);
  }

  /** Numbers the draft and generates its FatturaPA XML. */
  @ApiOperation({ summary: 'Numera la bozza e genera l\'XML FatturaPA' })
  @Post(':id/issue')
  @HttpCode(200)
  @ApiOkResponse({ type: InvoiceDetailDto })
  async issue(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: IssueInvoiceDto): Promise<InvoiceDetailDto> {
    return toInvoiceDetailDto(await this.service.issue(tenantId, id, dto));
  }

  /** Reopens an invoice rejected by SDI as a draft with the same number and date, to correct and send again. */
  @ApiOperation({ summary: 'Riapre una fattura scartata dallo SDI per correggerla e reinviarla con lo stesso numero' })
  @Post(':id/correction')
  @HttpCode(200)
  @ApiOkResponse({ type: InvoiceDetailDto })
  async reopenForCorrection(@TenantId() tenantId: string, @Param('id') id: string): Promise<InvoiceDetailDto> {
    return toInvoiceDetailDto(await this.service.reopenForCorrection(tenantId, id));
  }

  /**
   * Creates a draft that replaces an invoice rejected by SDI with a new number and date, when it cannot be sent again
   * with its own (Circ. AdE 13/E/2018 §1.6, a).
   */
  @ApiOperation({ summary: 'Crea la bozza che sostituisce una fattura scartata con un nuovo numero' })
  @Post(':id/replacement')
  @ApiCreatedResponse({ type: InvoiceDetailDto })
  async createReplacement(@TenantId() tenantId: string, @Param('id') id: string): Promise<InvoiceDetailDto> {
    return toInvoiceDetailDto(await this.service.createReplacement(tenantId, id));
  }

  /** Installments of a draft from its payment terms, shown before issuing; null without payment data. */
  @ApiOperation({ summary: 'Pagamento della bozza come sarà scritto all\'emissione: modalità, banca e rate' })
  @Get(':id/payment')
  @ApiOkResponse({ type: InvoicePaymentPlanDto })
  async payment(@TenantId() tenantId: string, @Param('id') id: string): Promise<InvoicePaymentPlanDto | null> {
    const payment = await this.service.draftPayment(tenantId, id);
    return payment ? toInvoicePaymentPlanDto(payment) : null;
  }

  /** Thresholds of the year if this draft were issued, to warn before issuing it. */
  @ApiOperation({ summary: 'Soglie dell\'anno se questa bozza fosse emessa' })
  @Get(':id/thresholds')
  @ApiOkResponse({ type: ThresholdOutlookDto })
  async thresholds(@TenantId() tenantId: string, @Param('id') id: string): Promise<ThresholdOutlookDto> {
    return toThresholdOutlookDto(await this.service.thresholds(tenantId, id));
  }
}
