import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, Matches } from 'class-validator';

export class TelematicFileQueryDto {
  @ApiProperty({ description: 'Data di versamento (AAAA-MM-GG): nel file vanno gli F24 da pagare di quella data', example: '2026-11-16' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsISO8601({ strict: true }) date!: string;
}
