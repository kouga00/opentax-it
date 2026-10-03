import { UserAccountDto } from '../dto/response/user-account.dto.js';
import { UserMembershipDto } from '../dto/response/user-membership.dto.js';
import type { UserAccount } from '../types/user-account.js';

/** Field by field: the password hash and the legacy tenant link stay out. */
export function toUserAccountDto(u: UserAccount): UserAccountDto {
  return Object.assign(new UserAccountDto(), {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    memberships: u.memberships.map((m) => Object.assign(new UserMembershipDto(), { tenantId: m.tenantId, tenantName: m.tenant.name, role: m.role })),
  });
}
