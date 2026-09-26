import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse } from '@nestjs/swagger';
import { TenantId } from '../../common/tenant.decorator.js';
import { CreatePaymentDto } from '../dto/request/create-payment.dto.js';
import { InvoiceCollectionDto } from '../dto/response/invoice-collection.dto.js';
import { PaymentDto } from '../dto/response/payment.dto.js';
import { toInvoiceCollectionDto, toPaymentDto } from '../mappers/payments.mapper.js';
import { PaymentsService } from '../services/payments.service.js';

/** Collections of issued documents: the summary and the new collections hang under the document, a collection is removed by its id. */
@Controller()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get('invoices/:id/collection')
  @ApiOkResponse({ type: InvoiceCollectionDto, description: 'Totale, incassato, residuo, modalità di pagamento e incassi del documento' })
  async collection(@TenantId() tenantId: string, @Param('id') id: string): Promise<InvoiceCollectionDto> {
    return toInvoiceCollectionDto(await this.service.collection(tenantId, id));
  }

  @Post('invoices/:id/payments')
  @ApiCreatedResponse({ type: PaymentDto })
  async create(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: CreatePaymentDto): Promise<PaymentDto> {
    return toPaymentDto(await this.service.create(tenantId, id, dto));
  }

  @Delete('payments/:id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@TenantId() tenantId: string, @Param('id') id: string): Promise<void> {
    return this.service.remove(tenantId, id);
  }
}
