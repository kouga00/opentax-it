import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** A reply of SDI without receipts, e.g. the "messaggio di cortesia", shown as it is. */
export class SdiReplyDto {
  @ApiProperty({ description: 'Mittente certificato' }) from!: string;
  @ApiPropertyOptional() subject?: string;
  @ApiPropertyOptional({ description: 'ISO 8601' }) receivedAt?: string;
  @ApiPropertyOptional({ description: 'Inizio del testo del messaggio' }) text?: string;
}
