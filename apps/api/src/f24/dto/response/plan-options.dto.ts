import { ApiProperty } from '@nestjs/swagger';
import { PlanStartOptionDto } from './plan-start-option.dto.js';

/** First due dates allowed for a tax year, from the rule set of the payment year. */
export class PlanOptionsDto {
  @ApiProperty() taxYear!: number;
  @ApiProperty() paymentYear!: number;
  @ApiProperty({ description: 'Anno del set di regole usato per le date' }) rulesYear!: number;
  @ApiProperty({ type: [String] }) warnings!: string[];
  @ApiProperty({ type: [PlanStartOptionDto] }) starts!: PlanStartOptionDto[];
  @ApiProperty({ description: 'Scadenza del secondo acconto (AAAA-MM-GG)' }) secondAdvanceDate!: string;
}
