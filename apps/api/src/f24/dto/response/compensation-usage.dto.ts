import { ApiProperty } from '@nestjs/swagger';

export class CompensationUsageDto {
  @ApiProperty() creditId!: string;
  @ApiProperty() amount!: number;
}
