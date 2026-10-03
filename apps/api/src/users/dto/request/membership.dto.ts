import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Length } from 'class-validator';
import type { UserRole } from '../../../generated/prisma/enums.js';
import { MEMBERSHIP_ROLES } from '../../types/user-roles.js';

/** Access of a user to one VAT number. */
export class MembershipDto {
  @ApiProperty() @IsString() @Length(1, 64) tenantId!: string;

  @ApiProperty({ enum: MEMBERSHIP_ROLES, description: 'TENANT_ADMIN: lettura e scrittura; TENANT_USER: sola lettura' })
  @IsIn(MEMBERSHIP_ROLES)
  role!: UserRole;
}
