import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { UserRole } from '../generated/prisma/enums.js';
import { ReadOnlyGuard } from './read-only.guard.js';

const context = (method: string, user: object | undefined, tenantId: string | null = 't1') =>
  ({ getHandler: vi.fn(), getClass: vi.fn(), switchToHttp: () => ({ getRequest: () => ({ method, user, tenantId }) }) }) as never;
const member = (role: UserRole) => ({ role: UserRole.TENANT_USER, memberships: [{ tenantId: 't1', role }] });

describe('ReadOnlyGuard', () => {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
  const guard = new ReadOnlyGuard(reflector);

  it('lets a read-only member read but not write', () => {
    expect(guard.canActivate(context('GET', member(UserRole.TENANT_USER)))).toBe(true);
    expect(() => guard.canActivate(context('POST', member(UserRole.TENANT_USER)))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context('DELETE', member(UserRole.TENANT_USER)))).toThrow(ForbiddenException);
  });

  it('lets a read-write member and the platform admin write', () => {
    expect(guard.canActivate(context('PUT', member(UserRole.TENANT_ADMIN)))).toBe(true);
    expect(guard.canActivate(context('POST', { role: UserRole.PLATFORM_ADMIN, memberships: [] }))).toBe(true);
  });

  it('lets read-only members use the routes marked @AllowReadOnly', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);
    expect(guard.canActivate(context('POST', member(UserRole.TENANT_USER)))).toBe(true);
  });
});
