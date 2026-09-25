import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Inserisci un indirizzo email valido' })
  email!: string;

  @IsString({ message: 'La password deve essere una stringa' })
  @MinLength(8, { message: 'La password deve contenere almeno 8 caratteri' })
  @MaxLength(128, { message: 'La password non può superare 128 caratteri' })
  password!: string;

  @IsOptional()
  @IsString({ message: 'Il nome deve essere una stringa' })
  @MaxLength(100, { message: 'Il nome non può superare 100 caratteri' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Il token di configurazione deve essere una stringa' })
  setupToken?: string;
}
