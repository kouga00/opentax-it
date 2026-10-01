import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'mario.rossi@example.com', description: 'Email dell\'utente' })
  @IsEmail({}, { message: 'Inserisci un indirizzo email valido' })
  email!: string;

  @ApiProperty({ example: 'PasswordSegreta123!', description: 'Password dell\'utente (min 8 caratteri, max 128)' })
  @IsString({ message: 'La password deve essere una stringa' })
  @MinLength(8, { message: 'La password deve contenere almeno 8 caratteri' })
  @MaxLength(128, { message: 'La password non può superare 128 caratteri' })
  password!: string;

  @ApiPropertyOptional({ example: 'Mario Rossi', description: 'Nome completo dell\'utente (max 100 caratteri)' })
  @IsOptional()
  @IsString({ message: 'Il nome deve essere una stringa' })
  @MaxLength(100, { message: 'Il nome non può superare 100 caratteri' })
  name?: string;

  @ApiPropertyOptional({ description: 'Setup token per creare un account amministratore di piattaforma' })
  @IsOptional()
  @IsString({ message: 'Il token di configurazione deve essere una stringa' })
  setupToken?: string;
}
