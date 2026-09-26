import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ description: "Data dell'incasso (AAAA-MM-GG)", example: '2026-09-26' })
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;

  @ApiProperty({ description: 'Importo nella valuta del documento; negativo per un rimborso (es. su una nota di credito)' })
  @IsNumber() @Min(-1_000_000_000) @Max(1_000_000_000) amount!: number;

  @ApiPropertyOptional({ description: "Importo in euro per i documenti in valuta; se manca: importo × cambio dell'incasso" })
  @IsOptional() @IsNumber() @Min(-1_000_000_000) @Max(1_000_000_000) amountEur?: number;

  @ApiPropertyOptional({ description: "Euro per unità della valuta nel giorno dell'incasso (art. 9 c. 2 TUIR); obbligatorio in valuta se manca amountEur" })
  @IsOptional() @IsNumber() @Min(0.000001) @Max(1_000_000) exchangeRate?: number;

  @ApiPropertyOptional({ description: 'Modalità di pagamento; se manca, quella indicata nel documento' })
  @IsOptional() @IsString() @Length(1, 40) method?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
