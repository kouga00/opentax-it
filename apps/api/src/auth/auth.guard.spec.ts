import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGuard } from './auth.guard.js';
import type { AuthService } from './auth.service.js';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let reflectorMock: any;
  let authServiceMock: any;

  beforeEach(() => {
    reflectorMock = {
      getAllAndOverride: vi.fn(),
    };
    authServiceMock = {
      validateSession: vi.fn(),
    };
    guard = new AuthGuard(
      reflectorMock as unknown as Reflector,
      authServiceMock as unknown as AuthService,
    );
  });

  function createMockContext(headers: Record<string, string> = {}) {
    const req: any = {
      header: (name: string) => headers[name.toLowerCase()] || undefined,
      headers,
    };
    return {
      context: {
        switchToHttp: () => ({
          getRequest: () => req,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext,
      req,
    };
  }

  it('allows public routes without token', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(true);
    const { context } = createMockContext();

    const allowed = await guard.canActivate(context);
    expect(allowed).toBe(true);
  });

  it('rejects protected routes without token', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(false);
    const { context } = createMockContext();

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects protected routes with invalid token', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(false);
    authServiceMock.validateSession.mockResolvedValue(null);
    const { context } = createMockContext({ authorization: 'Bearer invalid_token' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('allows protected routes with valid Bearer token and attaches user and tenantId', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(false);
    const sessionData = {
      user: { id: 'u1', email: 'test@opentax.it' },
      session: { id: 's1', activeTenantId: 't1' },
    };
    authServiceMock.validateSession.mockResolvedValue(sessionData);
    const { context, req } = createMockContext({ authorization: 'Bearer valid_token' });

    const allowed = await guard.canActivate(context);
    expect(allowed).toBe(true);
    expect(req.user).toEqual(sessionData.user);
    expect(req.session).toEqual(sessionData.session);
    expect(req.tenantId).toBe('t1');
    expect(req.sessionToken).toBe('valid_token');
  });

  it('extracts token from cookie header', async () => {
    reflectorMock.getAllAndOverride.mockReturnValue(false);
    const sessionData = {
      user: { id: 'u1' },
      session: { id: 's1', activeTenantId: 't1' },
    };
    authServiceMock.validateSession.mockResolvedValue(sessionData);
    const { context, req } = createMockContext({ cookie: 'other=123; opentax_session=cookietoken; foo=bar' });

    const allowed = await guard.canActivate(context);
    expect(allowed).toBe(true);
    expect(req.sessionToken).toBe('cookietoken');
    expect(authServiceMock.validateSession).toHaveBeenCalledWith('cookietoken');
  });
});
