import { ApiProperty } from '@nestjs/swagger';

/** Balance and advances of the substitute tax and of the INPS contributions (LM46, RR7 and advances). */
export class PlanAmountsDto {
  @ApiProperty() taxBalance!: number;
  @ApiProperty() taxFirstAdvance!: number;
  @ApiProperty() taxSecondAdvance!: number;
  @ApiProperty() inpsBalance!: number;
  @ApiProperty() inpsFirstAdvance!: number;
  @ApiProperty() inpsSecondAdvance!: number;
}
