import { ApiProperty } from '@nestjs/swagger';
import { PLAN_STARTS, type PlanStart } from '../../types/plan-start.js';
import { CompensationDto } from './compensation.dto.js';
import { PlanAmountsDto } from './plan-amounts.dto.js';
import { PlanCreditsDto } from './plan-credits.dto.js';
import { PlannedFormDto } from './planned-form.dto.js';

/** Forms that a plan with the given choices would produce; nothing is saved. */
export class PlanPreviewDto {
  @ApiProperty() taxYear!: number;
  @ApiProperty() paymentYear!: number;
  @ApiProperty() rulesYear!: number;
  @ApiProperty({ type: Number, nullable: true }) ruleSetVersion!: number | null;
  @ApiProperty({ enum: PLAN_STARTS }) start!: PlanStart;
  @ApiProperty({ description: 'AAAA-MM-GG' }) firstDueDate!: string;
  @ApiProperty() surchargePct!: number;
  @ApiProperty() installments!: number;
  @ApiProperty() maxInstallments!: number;
  @ApiProperty({ type: PlanAmountsDto, description: 'Importi dovuti dalla dichiarazione, prima dei crediti' }) due!: PlanAmountsDto;
  @ApiProperty({ type: PlanAmountsDto, description: 'Importi ripartiti nei modelli, dopo i crediti' }) amounts!: PlanAmountsDto;
  @ApiProperty({ type: PlanCreditsDto }) credits!: PlanCreditsDto;
  @ApiProperty({ type: CompensationDto }) compensation!: CompensationDto;
  @ApiProperty() inpsOfficeCode!: string;
  @ApiProperty({ type: [PlannedFormDto] }) forms!: PlannedFormDto[];
  @ApiProperty({ type: [String] }) warnings!: string[];
}
