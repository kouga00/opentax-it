import { ApiProperty } from '@nestjs/swagger';

export class PaymentDto {
  @ApiProperty() id!: string;
  @ApiProperty({ description: 'Data dell\'incasso (AAAA-MM-GG)', example: '2026-09-26' }) date!: string;
  @ApiProperty({ description: 'Importo nella valuta del documento; negativo per un rimborso' }) amount!: number;
  @ApiProperty({ description: 'Importo in euro, al cambio del giorno dell\'incasso (art. 9 c. 2 TUIR)' }) amountEur!: number;
  @ApiProperty({ description: 'Euro per unità della valuta del documento (1 per l\'euro)' }) exchangeRate!: number;
  @ApiProperty({ type: String, nullable: true, description: 'Modalità di pagamento, es. MP05' }) method!: string | null;
  @ApiProperty({ type: String, nullable: true }) notes!: string | null;
}
