import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/enums.js';

export class UserMembershipDto {
  @ApiProperty() tenantId!: string;
  @ApiProperty({ description: 'Nome della partita IVA' }) tenantName!: string;
  @ApiProperty({ enum: UserRole, description: 'TENANT_ADMIN: lettura e scrittura; TENANT_USER: sola lettura' }) role!: UserRole;
}
