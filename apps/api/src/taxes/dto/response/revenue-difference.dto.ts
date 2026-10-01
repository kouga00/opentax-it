import { ApiProperty } from '@nestjs/swagger';

/** An invoice collected in a year other than its issue year. */
export class RevenueDifferenceDto {
  @ApiProperty() invoiceId!: string;
  @ApiProperty() number!: string;
  @ApiProperty({ description: 'Data della fattura (AAAA-MM-GG)' }) date!: string;
  @ApiProperty() customer!: string;
  @ApiProperty({ description: 'Parte dei ricavi interessata, in euro' }) amount!: number;
}
