import { ApiProperty } from '@nestjs/swagger';

/** Credits resulting from the return (negative balances). */
export class PlanCreditsDto {
  @ApiProperty() tax!: number;
  @ApiProperty() inps!: number;
}
