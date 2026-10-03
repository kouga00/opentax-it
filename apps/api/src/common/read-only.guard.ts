import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UserWithMemberships } from '../auth/types/user-with-memberships.js';
import { UserRole } from '../generated/prisma/enums.js';
import { ALLOW_READ_ONLY_KEY } from './allow-read-only.decorator.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Read-only access to a tenant: a member with role TENANT_USER can read the active tenant's data but not change it,
 * TENANT_ADMIN can read and write; the platform admin manages everything. Runs after AuthGuard, which sets the user
 * and the active tenant of the session (OWASP API5:2023, Broken Function Level Authorization).
 */
@Injectable()
export class ReadOnlyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: UserWithMemberships; tenantId?: string | null }>();
    if (SAFE_METHODS.has(req.method)) return true;
    if (this.reflector.getAllAndOverride<boolean>(ALLOW_READ_ONLY_KEY, [context.getHandler(), context.getClass()])) return true;
    const { user, tenantId } = req;
    if (!user || !tenantId || user.role === UserRole.PLATFORM_ADMIN) return true;
    const membership = user.memberships?.find((m) => m.tenantId === tenantId);
    if (membership?.role === UserRole.TENANT_USER) throw new ForbiddenException('Hai accesso in sola lettura a questa partita IVA');
    return true;
  }
}
