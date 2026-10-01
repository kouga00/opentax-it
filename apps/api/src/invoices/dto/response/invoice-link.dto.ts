import { ApiProperty } from '@nestjs/swagger';

/** Another invoice referred to by this one, by id and number. */
export class InvoiceLinkDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'Numero; vuoto per una bozza' }) number!: string;
}
