import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from '@nestjs/swagger';
import { TenantId } from '../../common/tenant.decorator.js';
import { IssueInvoiceDto } from '../dto/request/issue-invoice.dto.js';
import { ListInvoicesQueryDto } from '../dto/request/list-invoices-query.dto.js';
import { SaveInvoiceDto } from '../dto/request/save-invoice.dto.js';
import { InvoiceDetailDto } from '../dto/response/invoice-detail.dto.js';
import { InvoiceDto } from '../dto/response/invoice.dto.js';
import { ThresholdOutlookDto } from '../dto/response/threshold-outlook.dto.js';
import { toInvoiceDetailDto, toInvoiceDto, toThresholdOutlookDto } from '../mappers/invoice.mapper.js';
import { InvoicesService } from '../services/invoices.service.js';

/**
 * Documents and their life cycle: drafts, issue, deletion. Import, files (XML, PDF) and the revenue thresholds of
 * the year have their own controllers.
 */
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  /** Years that have at least one invoice (declared before ':id' routes). */
  @Get('years')
  @ApiOkResponse({ type: [Number] })
  years(@TenantId() tenantId: string): Promise<number[]> {
    return this.service.years(tenantId);
  }

  @Get()
  @ApiOkResponse({ type: [InvoiceDto] })
  async list(@TenantId() tenantId: string, @Query() q: ListInvoicesQueryDto): Promise<InvoiceDto[]> {
    return (await this.service.list(tenantId, q)).map(toInvoiceDto);
  }

  @Get(':id')
  @ApiOkResponse({ type: InvoiceDetailDto })
  async get(@TenantId() tenantId: string, @Param('id') id: string): Promise<InvoiceDetailDto> {
    return toInvoiceDetailDto(await this.service.get(tenantId, id));
  }

  @Post()
  @ApiCreatedResponse({ type: InvoiceDetailDto })
  async create(@TenantId() tenantId: string, @Body() dto: SaveInvoiceDto): Promise<InvoiceDetailDto> {
    return toInvoiceDetailDto(await this.service.create(tenantId, dto));
  }

  /** Replaces a draft: issued documents cannot be changed. */
  @Put(':id')
  @ApiOkResponse({ type: InvoiceDetailDto })
  async update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: SaveInvoiceDto): Promise<InvoiceDetailDto> {
    return toInvoiceDetailDto(await this.service.update(tenantId, id, dto));
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@TenantId() tenantId: string, @Param('id') id: string): Promise<void> {
    return this.service.remove(tenantId, id);
  }

  /** Numbers the draft and generates its FatturaPA XML. */
  @Post(':id/issue')
  @HttpCode(200)
  @ApiOkResponse({ type: InvoiceDetailDto })
  async issue(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: IssueInvoiceDto): Promise<InvoiceDetailDto> {
    return toInvoiceDetailDto(await this.service.issue(tenantId, id, dto));
  }

  /** Thresholds of the year if this draft were issued, to warn before issuing it. */
  @Get(':id/thresholds')
  @ApiOkResponse({ type: ThresholdOutlookDto })
  async thresholds(@TenantId() tenantId: string, @Param('id') id: string): Promise<ThresholdOutlookDto> {
    return toThresholdOutlookDto(await this.service.thresholds(tenantId, id));
  }
}
