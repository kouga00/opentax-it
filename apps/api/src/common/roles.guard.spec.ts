import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../generated/prisma/enums.js';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(user?: any) {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as any;
  }

  it('allows access when no roles are required', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = createMockContext();

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws UnauthorizedException when required roles exist but no user is attached to request', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.PLATFORM_ADMIN]);
    const ctx = createMockContext(undefined);

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(ctx)).toThrow('Autenticazione richiesta');
  });

  it('throws ForbiddenException when user lacks the required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.PLATFORM_ADMIN]);
    const ctx = createMockContext({ id: 'u1', role: UserRole.TENANT_USER });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx)).toThrow('Permessi insufficienti per accedere a questa risorsa');
  });

  it('allows access when user has the required role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.PLATFORM_ADMIN]);
    const ctx = createMockContext({ id: 'u1', role: UserRole.PLATFORM_ADMIN });

    expect(guard.canActivate(ctx)).toBe(true);
  });
});
