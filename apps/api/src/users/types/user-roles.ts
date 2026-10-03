import { UserRole } from '../../generated/prisma/enums.js';

/** Global roles: the platform admin manages users, VAT numbers and rule sets; a user sees only its VAT numbers. */
export const ACCOUNT_ROLES = [UserRole.PLATFORM_ADMIN, UserRole.TENANT_USER] as const;
/** Access to one VAT number: TENANT_ADMIN reads and writes, TENANT_USER only reads (common/read-only.guard.ts). */
export const MEMBERSHIP_ROLES = [UserRole.TENANT_ADMIN, UserRole.TENANT_USER] as const;
