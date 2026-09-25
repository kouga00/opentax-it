import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Inserisci un indirizzo email valido' })
  email!: string;

  @IsString({ message: 'La password deve essere una stringa' })
  @MinLength(8, { message: 'La password deve contenere almeno 8 caratteri' })
  password!: string;
}
