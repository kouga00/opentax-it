import { ApiProperty } from '@nestjs/swagger';
import { InvoiceLineResponseDto } from './invoice-line.dto.js';
import { InvoiceDto } from './invoice.dto.js';

export class InvoiceDetailDto extends InvoiceDto {
  @ApiProperty({ type: [InvoiceLineResponseDto] }) lines!: InvoiceLineResponseDto[];
}
