import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { F24Status } from '../../../generated/prisma/enums.js';

export class UpdateF24StatusDto {
  @ApiProperty({ enum: F24Status })
  @IsEnum(F24Status) status!: F24Status;

  @ApiPropertyOptional({ description: 'Data del pagamento (AAAA-MM-GG); se manca, oggi' })
  @IsOptional() @IsDateString() paidOn?: string;

  @ApiPropertyOptional({ description: 'Come è stato pagato (es. F24 web, home banking); solo con lo stato PAID', maxLength: 500 })
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
