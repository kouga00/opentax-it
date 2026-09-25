import { UserResponseDto } from './user-response.dto.js';

export class AuthResponseDto {
  token!: string;
  user!: UserResponseDto;
  expiresAt!: string;
}
