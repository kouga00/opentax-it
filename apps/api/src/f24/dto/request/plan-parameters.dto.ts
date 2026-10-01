import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { COMPENSATION_ORDERS, type CompensationOrder } from '../../types/compensation-order.js';
import { PLAN_STARTS, type PlanStart } from '../../types/plan-start.js';

/** Choices for an installment plan, to preview it or to create it. */
export class PlanParametersDto {
  @ApiProperty({ enum: PLAN_STARTS, description: 'Scadenza di saldo e primo acconto: ordinaria, proroga, differimento di 30 giorni' })
  @IsIn(PLAN_STARTS) start!: PlanStart;

  @ApiProperty({ description: '1 = unica soluzione; il massimo dipende dalla prima scadenza (rate fino al 16 dicembre)' })
  @IsInt() @Min(1) installments!: number;

  @ApiPropertyOptional({ description: 'Usa i crediti disponibili in un F24 a saldo zero prima di rateizzare il resto' })
  @IsOptional() @IsBoolean() useCredits?: boolean;

  @ApiPropertyOptional({ enum: COMPENSATION_ORDERS, description: 'Quali debiti coprire prima con i crediti' })
  @IsOptional() @IsIn(COMPENSATION_ORDERS) creditOrder?: CompensationOrder;
}
