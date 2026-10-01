import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'mario.rossi@example.com', description: 'Email dell\'utente' })
  @IsEmail({}, { message: 'Inserisci un indirizzo email valido' })
  email!: string;

  @ApiProperty({ example: 'PasswordSegreta123!', description: 'Password dell\'utente' })
  @IsString({ message: 'Credenziali non valide' })
  @IsNotEmpty({ message: 'Credenziali non valide' })
  @MaxLength(128, { message: 'Credenziali non valide' })
  password!: string;
}
