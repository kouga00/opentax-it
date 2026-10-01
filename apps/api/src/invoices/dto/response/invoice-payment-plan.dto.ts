import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceInstallmentDto } from './invoice-installment.dto.js';

/** Payment of a draft as it will be written at issue: method, bank and installments. */
export class InvoicePaymentPlanDto {
  @ApiPropertyOptional({ description: 'ModalitaPagamento, es. MP05' }) method?: string;
  @ApiPropertyOptional() iban?: string;
  @ApiPropertyOptional() bic?: string;
  @ApiProperty({ type: [InvoiceInstallmentDto], description: 'Una rata per DettaglioPagamento (TP01 se più di una)' }) installments!: InvoiceInstallmentDto[];
}
