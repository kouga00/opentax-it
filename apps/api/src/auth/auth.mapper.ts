import type { User, UserRole, TenantMember, Tenant, Session } from '../generated/prisma/client.js';
import { AuthResponseDto } from './dto/response/auth-response.dto.js';
import { TenantSummaryResponseDto } from './dto/response/tenant-summary-response.dto.js';
import { UserResponseDto } from './dto/response/user-response.dto.js';

export interface UserWithMemberships extends User {
  memberships?: Array<TenantMember & { tenant: Pick<Tenant, 'id' | 'name'> }>;
}

export class AuthMapper {
  static toTenantSummary(member: TenantMember & { tenant: Pick<Tenant, 'id' | 'name'> }): TenantSummaryResponseDto {
    const dto = new TenantSummaryResponseDto();
    dto.id = member.tenant.id;
    dto.name = member.tenant.name;
    dto.role = member.role;
    return dto;
  }

  static toUserResponse(user: UserWithMemberships, activeTenantId?: string | null): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name ?? null;
    dto.role = user.role;
    dto.activeTenantId = activeTenantId ?? null;
    dto.tenants = (user.memberships ?? []).map((m) => this.toTenantSummary(m));
    return dto;
  }

  static toAuthResponse(token: string, session: Session, user: UserWithMemberships): AuthResponseDto {
    const dto = new AuthResponseDto();
    dto.token = token;
    dto.expiresAt = session.expiresAt.toISOString();
    dto.user = this.toUserResponse(user, session.activeTenantId);
    return dto;
  }
}
