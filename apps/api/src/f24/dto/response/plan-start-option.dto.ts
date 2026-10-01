import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PLAN_STARTS, type PlanStart } from '../../types/plan-start.js';

export class PlanStartOptionDto {
  @ApiProperty({ enum: PLAN_STARTS }) start!: PlanStart;
  @ApiProperty({ description: 'Prima scadenza (AAAA-MM-GG)' }) date!: string;
  @ApiProperty({ description: 'Maggiorazione per differimento, in percentuale' }) surchargePct!: number;
  @ApiProperty() maxInstallments!: number;
  @ApiPropertyOptional({ description: 'Fonte della scadenza nel set di regole' }) source?: string;
}
