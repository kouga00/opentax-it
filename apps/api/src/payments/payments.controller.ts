import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { TenantId } from '../common/tenant.decorator.js';
import { InvoiceCollectionDto } from './dto/response/invoice-collection.dto.js';
import { toInvoiceCollectionDto } from './payments.mapper.js';
import { CreatePaymentDto } from './payments.dto.js';
import { PaymentsService } from './payments.service.js';

@Controller()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get('invoices/:id/collection')
  @ApiOkResponse({ type: InvoiceCollectionDto, description: 'Totale, incassato, residuo, modalità di pagamento e incassi del documento' })
  async collection(@TenantId() tenantId: string, @Param('id') id: string): Promise<InvoiceCollectionDto> {
    return toInvoiceCollectionDto(await this.service.collection(tenantId, id));
  }

  @Get('invoices/:id/payments')
  byInvoice(@TenantId() tenantId: string, @Param('id') id: string) { return this.service.listByInvoice(tenantId, id); }

  @Post('invoices/:id/payments')
  create(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: CreatePaymentDto) { return this.service.create(tenantId, id, dto); }

  @Get('payments')
  byYear(@TenantId() tenantId: string, @Query('year', ParseIntPipe) year: number) { return this.service.listByYear(tenantId, year); }

  @Delete('payments/:id') @HttpCode(204)
  remove(@TenantId() tenantId: string, @Param('id') id: string) { return this.service.remove(tenantId, id); }
}
