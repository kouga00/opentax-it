import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CreateStampDutyF24Dto {
  @ApiProperty({ description: "Importo dovuto mostrato dall'Agenzia delle Entrate nel portale Fatture e corrispettivi, in euro" })
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(10_000_000) amount!: number;

  @ApiPropertyOptional({ description: 'Data di addebito (AAAA-MM-GG), non oltre la scadenza; se manca, la scadenza' })
  @IsOptional() @IsDateString() paymentDate?: string;
}
