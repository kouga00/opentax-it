import type { User, TenantMember, Tenant } from '../../generated/prisma/client.js';

export interface UserWithMemberships extends User {
  memberships?: Array<TenantMember & { tenant: Pick<Tenant, 'id' | 'name'> }>;
}
