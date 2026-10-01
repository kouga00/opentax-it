import { ApiProperty } from '@nestjs/swagger';

/** A credit put in the credit registry by the filed return. */
export class FiledCreditDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'Sezione del modello F24' }) section!: string;
  @ApiProperty({ description: 'Codice tributo o causale INPS', example: '1792' }) code!: string;
  @ApiProperty() referenceYear!: number;
  @ApiProperty() amount!: number;
}
