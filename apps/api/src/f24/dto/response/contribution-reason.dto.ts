import { ApiProperty } from '@nestjs/swagger';

/** A reason ("causale contributo") that can be entered by hand, with its deductibility (LM35). */
export class ContributionReasonDto {
  @ApiProperty({ description: 'Causale' }) code!: string;
  @ApiProperty({ description: 'Descrizione, dalla tabella AdE o dalla scheda INPS' }) description!: string;
  @ApiProperty({ enum: ['YES', 'NO', 'MIXED', 'UNKNOWN'], description: 'Deducibile dal reddito quando pagata (LM35)' }) deduction!: string;
}
