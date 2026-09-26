import { ApiProperty } from '@nestjs/swagger';

/** The installment plan a saved form belongs to. */
export class F24PlanRefDto {
  @ApiProperty() taxYear!: number;
  @ApiProperty() installments!: number;
}
