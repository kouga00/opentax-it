import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, Matches } from 'class-validator';

export class FileReturnDto {
  @ApiProperty({ description: 'Data di presentazione della dichiarazione (AAAA-MM-GG)', example: '2026-09-30' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsISO8601({ strict: true }) filedOn!: string;
}
