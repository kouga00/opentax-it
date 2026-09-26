import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { InvoicePaymentDto } from './invoice-payment.dto.js';

export class IssueInvoiceDto {
  @ApiPropertyOptional({ type: InvoicePaymentDto }) @IsOptional() @ValidateNested() @Type(() => InvoicePaymentDto) payment?: InvoicePaymentDto;
  /** Issue even when the projected revenue exceeds 100,000 or the personal limit. */
  @ApiPropertyOptional({ description: 'Emetti anche oltre 100.000 € o il limite personale' }) @IsOptional() @IsBoolean() confirmThresholds?: boolean;
}
