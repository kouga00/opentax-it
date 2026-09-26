import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { PAYMENT_METHODS } from '@opentax-it/fatturapa';

/** DatiPagamento given when issuing: they replace due date and IBAN of the draft. */
export class InvoicePaymentDto {
  @ApiPropertyOptional({ description: 'Scadenza del pagamento (AAAA-MM-GG)' }) @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) dueDate?: string;
  @ApiPropertyOptional({ enum: Object.keys(PAYMENT_METHODS), description: 'ModalitaPagamento; se manca, quella della bozza' }) @IsOptional() @IsIn(Object.keys(PAYMENT_METHODS)) method?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(15, 34) iban?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(8, 11) bic?: string;
}
