import { ApiProperty } from '@nestjs/swagger';

/** Part of a credit used in one F24 form. */
export class TaxCreditUsageDto {
  @ApiProperty() amount!: number;
  @ApiProperty() f24Id!: string;
  @ApiProperty({ description: 'Data di versamento del modello (AAAA-MM-GG)' }) paymentDate!: string;
  @ApiProperty({ description: 'Stato del modello F24' }) f24Status!: string;
}
