import { BadRequestException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthService } from '../auth/auth.service.js';
import { OptionalTenantId } from './optional-tenant.decorator.js';
import { TenantId } from './tenant.decorator.js';

function getParamDecoratorFactory(decorator: Function) {
  // NestJS param decorators store their factory in metadata
  // We can also invoke the callback directly by calling the decorator factory
  class TestClass {
    testMethod(@decorator() _val: any) {}
  }
  const metadata = Reflect.getMetadata('__routeArguments__', TestClass, 'testMethod');
  const key = Object.keys(metadata)[0];
  return metadata[key].factory;
}

describe('Tenant Isolation & Decorators', () => {
  const tenantIdFactory = getParamDecoratorFactory(TenantId);
  const optionalTenantIdFactory = getParamDecoratorFactory(OptionalTenantId);

  function mockContext(req: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  describe('TenantId decorator', () => {
    it('returns tenantId when set on request by authenticated session', () => {
      const ctx = mockContext({ tenantId: 'tenant_123', headers: {} });
      const result = tenantIdFactory(null, ctx);
      expect(result).toBe('tenant_123');
    });

    it('throws BadRequestException when no active tenant in session, strictly ignoring x-tenant-id header', () => {
      const ctx = mockContext({
        tenantId: undefined,
        headers: { 'x-tenant-id': 'malicious_tenant_attempt' },
        header: (name: string) => (name.toLowerCase() === 'x-tenant-id' ? 'malicious_tenant_attempt' : undefined),
      });
      expect(() => tenantIdFactory(null, ctx)).toThrow(BadRequestException);
    });

    it('throws BadRequestException on unauthenticated request with x-tenant-id header', () => {
      const ctx = mockContext({
        headers: { 'x-tenant-id': 'any_tenant' },
        header: (name: string) => (name.toLowerCase() === 'x-tenant-id' ? 'any_tenant' : undefined),
      });
      expect(() => tenantIdFactory(null, ctx)).toThrow(BadRequestException);
    });
  });

  describe('OptionalTenantId decorator', () => {
    it('returns tenantId when set on request by authenticated session', () => {
      const ctx = mockContext({ tenantId: 'tenant_123', headers: {} });
      const result = optionalTenantIdFactory(null, ctx);
      expect(result).toBe('tenant_123');
    });

    it('returns undefined on public/unauthenticated request, strictly ignoring x-tenant-id header', () => {
      const ctx = mockContext({
        tenantId: undefined,
        headers: { 'x-tenant-id': 'other_tenant_id' },
        header: (name: string) => (name.toLowerCase() === 'x-tenant-id' ? 'other_tenant_id' : undefined),
      });
      const result = optionalTenantIdFactory(null, ctx);
      expect(result).toBeUndefined();
    });
  });

  describe('AuthGuard & Tenant Isolation', () => {
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

    it('rejects unauthenticated requests on protected routes even if x-tenant-id is provided', async () => {
      reflectorMock.getAllAndOverride.mockReturnValue(false); // protected route
      const req: any = {
        headers: { 'x-tenant-id': 'victim_tenant' },
        header: (name: string) => (name.toLowerCase() === 'x-tenant-id' ? 'victim_tenant' : undefined),
      };
      const ctx = mockContext(req);

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
      expect(req.tenantId).toBeUndefined();
    });

    it('allows public routes without authentication and leaves tenantId undefined even if x-tenant-id is sent', async () => {
      reflectorMock.getAllAndOverride.mockReturnValue(true); // public route
      const req: any = {
        headers: { 'x-tenant-id': 'victim_tenant' },
        header: (name: string) => (name.toLowerCase() === 'x-tenant-id' ? 'victim_tenant' : undefined),
      };
      const ctx = mockContext(req);

      const allowed = await guard.canActivate(ctx);
      expect(allowed).toBe(true);
      expect(req.tenantId).toBeUndefined();
    });

    it('populates tenantId solely from the verified session, ignoring spoofed x-tenant-id header', async () => {
      reflectorMock.getAllAndOverride.mockReturnValue(false);
      authServiceMock.validateSession.mockResolvedValue({
        user: { id: 'u1', email: 'user@test.it' },
        session: { id: 's1', activeTenantId: 'authorized_tenant' },
      });

      const req: any = {
        headers: {
          authorization: 'Bearer valid_token',
          'x-tenant-id': 'spoofed_tenant',
        },
        header: (name: string) => {
          if (name.toLowerCase() === 'authorization') return 'Bearer valid_token';
          if (name.toLowerCase() === 'x-tenant-id') return 'spoofed_tenant';
          return undefined;
        },
      };
      const ctx = mockContext(req);

      const allowed = await guard.canActivate(ctx);
      expect(allowed).toBe(true);
      expect(req.tenantId).toBe('authorized_tenant');
    });
  });
});
