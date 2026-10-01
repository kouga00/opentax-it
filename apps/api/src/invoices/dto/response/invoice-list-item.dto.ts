import { ApiProperty } from '@nestjs/swagger';
import { InvoiceDto } from './invoice.dto.js';

/** A document of the list, with what was already collected, so that the list knows when nothing is left. */
export class InvoiceListItemDto extends InvoiceDto {
  @ApiProperty({ description: 'Già incassato (o rimborsato, per le note di credito), nella valuta del documento, in positivo' }) collected!: number;
}
