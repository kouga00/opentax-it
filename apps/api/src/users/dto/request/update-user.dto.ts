import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../../auth/services/password.service.js';
import type { UserRole } from '../../../generated/prisma/enums.js';
import { ACCOUNT_ROLES } from '../../types/user-roles.js';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Nome mostrato; vuoto lo toglie' })
  @IsOptional() @IsString() @MaxLength(100, { message: 'Il nome non può superare 100 caratteri' })
  name?: string;

  @ApiPropertyOptional({ description: 'Nuova password: chiude le sessioni aperte con la vecchia' })
  @IsOptional() @IsString() @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, { message: `La password deve contenere da ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_LENGTH} caratteri` })
  password?: string;

  @ApiPropertyOptional({ enum: ACCOUNT_ROLES })
  @IsOptional() @IsIn(ACCOUNT_ROLES)
  role?: UserRole;
}
