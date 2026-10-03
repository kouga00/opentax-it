import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../../auth/services/password.service.js';
import type { UserRole } from '../../../generated/prisma/enums.js';
import { ACCOUNT_ROLES } from '../../types/user-roles.js';

export class CreateUserDto {
  @ApiProperty({ example: 'commercialista@example.com' })
  @IsEmail({}, { message: 'Inserisci un indirizzo email valido' })
  email!: string;

  @ApiPropertyOptional({ example: 'Studio Rossi', description: 'Nome mostrato (max 100 caratteri)' })
  @IsOptional() @IsString() @MaxLength(100, { message: 'Il nome non può superare 100 caratteri' })
  name?: string;

  @ApiProperty({ description: `Password scelta dall'amministratore (da ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_LENGTH} caratteri)` })
  @IsString() @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, { message: `La password deve contenere da ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_LENGTH} caratteri` })
  password!: string;

  @ApiProperty({ enum: ACCOUNT_ROLES, description: 'Amministratore della piattaforma o utente' })
  @IsIn(ACCOUNT_ROLES)
  role!: UserRole;
}
