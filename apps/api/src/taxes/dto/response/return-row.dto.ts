import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** A row of the return with the value computed by the app. */
export class ReturnRowDto {
  @ApiProperty({ description: 'Rigo e colonna, es. LM22.3', example: 'LM22.3' }) id!: string;
  @ApiProperty({ example: 'LM22' }) row!: string;
  @ApiPropertyOptional({ example: 3 }) column?: number;
  @ApiProperty({ description: 'Valore in euro interi, codice o casella (X); null se l\'app non lo conosce', oneOf: [{ type: 'number' }, { type: 'string' }], nullable: true }) value!: number | string | null;
  @ApiProperty({ enum: ['ENTER', 'CHECK', 'RESULT', 'YOURS'], description: 'ENTER da inserire (non proposto dalla precompilata), CHECK proposto: da controllare, RESULT risultato dei righi sopra, YOURS dato che l\'app non conosce' }) action!: string;
}
