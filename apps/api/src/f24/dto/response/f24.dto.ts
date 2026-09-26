import { ApiProperty } from '@nestjs/swagger';
import { F24Kind, F24Status } from '../../../generated/prisma/enums.js';
import { F24LineDto } from './f24-line.dto.js';
import { F24PlanRefDto } from './f24-plan-ref.dto.js';

/** A saved F24 form. */
export class F24Dto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: F24Kind }) kind!: F24Kind;
  @ApiProperty({ enum: F24Status }) status!: F24Status;
  @ApiProperty({ description: 'AAAA-MM-GG' }) paymentDate!: string;
  @ApiProperty({ type: Number, nullable: true }) installmentNumber!: number | null;
  @ApiProperty({ type: Number, nullable: true }) installmentsTotal!: number | null;
  @ApiProperty() totalDebit!: number;
  @ApiProperty() totalCredit!: number;
  @ApiProperty({ description: 'Saldo da versare: debiti meno crediti' }) balance!: number;
  @ApiProperty({ type: String, nullable: true, description: 'AAAA-MM-GG' }) i24CancelBy!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'AAAA-MM-GG' }) paidOn!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Data e ora della programmazione I24 (ISO 8601)' }) i24ScheduledAt!: string | null;
  @ApiProperty({ type: F24PlanRefDto, nullable: true }) plan!: F24PlanRefDto | null;
  @ApiProperty({ type: [F24LineDto] }) lines!: F24LineDto[];
}
