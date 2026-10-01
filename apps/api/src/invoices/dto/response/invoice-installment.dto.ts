import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** An installment of the payment (DettaglioPagamento). */
export class InvoiceInstallmentDto {
  @ApiPropertyOptional({ description: 'Scadenza (AAAA-MM-GG)' }) dueDate?: string;
  @ApiProperty() amount!: number;
}
