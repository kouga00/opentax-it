import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto.js';

export class AuthResponseDto {
  @ApiProperty({ description: 'Token di sessione Bearer' })
  token!: string;

  @ApiProperty({ type: () => UserResponseDto, description: 'Dati dell\'utente autenticato' })
  user!: UserResponseDto;

  @ApiProperty({ description: 'Data e ora di scadenza della sessione in formato ISO 8601' })
  expiresAt!: string;
}
