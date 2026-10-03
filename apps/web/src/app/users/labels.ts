import type { UserRole } from '@/lib/types';

export const ACCOUNT_ROLE_LABEL: Partial<Record<UserRole, string>> = { PLATFORM_ADMIN: 'Amministratore', TENANT_USER: 'Utente' };
export const ACCESS_LABEL: Partial<Record<UserRole, string>> = { TENANT_ADMIN: 'Lettura e scrittura', TENANT_USER: 'Sola lettura' };

/** Copy of PASSWORD_MIN_LENGTH / PASSWORD_MAX_LENGTH in apps/api/src/auth/services/password.service.ts: the web does not import the API. */
export const PASSWORD_LIMITS = { min: 8, max: 128 };
