import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/enums.js';
import { UserMembershipDto } from './user-membership.dto.js';

export class UserAccountDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ type: String, nullable: true }) name!: string | null;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty({ description: 'Data di creazione (ISO 8601)' }) createdAt!: string;
  @ApiProperty({ type: [UserMembershipDto] }) memberships!: UserMembershipDto[];
}
