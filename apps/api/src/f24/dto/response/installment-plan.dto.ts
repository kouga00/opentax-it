import { ApiProperty } from '@nestjs/swagger';
import { F24Dto } from './f24.dto.js';

/** A saved installment plan and its forms. */
export class InstallmentPlanDto {
  @ApiProperty() id!: string;
  @ApiProperty() taxYear!: number;
  @ApiProperty() paymentYear!: number;
  @ApiProperty({ description: 'AAAA-MM-GG' }) firstDueDate!: string;
  @ApiProperty() installments!: number;
  @ApiProperty({ description: 'Maggiorazione per differimento, in percentuale' }) surchargePct!: number;
  @ApiProperty() taxBalance!: number;
  @ApiProperty() taxFirstAdvance!: number;
  @ApiProperty() taxSecondAdvance!: number;
  @ApiProperty() inpsBalance!: number;
  @ApiProperty() inpsFirstAdvance!: number;
  @ApiProperty() inpsSecondAdvance!: number;
  @ApiProperty() creditsUsed!: number;
  @ApiProperty({ type: Number, nullable: true, description: 'Versione del set di regole usato' }) ruleSetVersion!: number | null;
  @ApiProperty({ description: 'ISO 8601' }) createdAt!: string;
  @ApiProperty({ type: [F24Dto] }) f24s!: F24Dto[];
}
