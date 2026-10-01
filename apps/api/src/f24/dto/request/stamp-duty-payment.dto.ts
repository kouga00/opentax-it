import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, Max, Min } from 'class-validator';

/** A quarter paid with the debit from the "Fatture e corrispettivi" portal, without F24. */
export class StampDutyPaymentDto {
  @ApiProperty({ description: 'Importo pagato, in euro' })
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(10_000_000) amount!: number;

  @ApiProperty({ description: 'Data del pagamento (AAAA-MM-GG)' })
  @IsDateString() paidOn!: string;
}
