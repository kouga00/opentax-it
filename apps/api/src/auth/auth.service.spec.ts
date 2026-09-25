import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditLogService } from '../audit-log/audit-log.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { UserRole } from '../generated/prisma/enums.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import { PasswordService } from './password.service.js';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaMock: any;
  let auditLogMock: any;
  let passwordService: PasswordService;

  beforeEach(() => {
    prismaMock = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(prismaMock)),
      user: {
        findUnique: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
      },
      session: {
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        updateMany: vi.fn(),
      },
      tenant: {
        findUnique: vi.fn(),
      },
    };

    auditLogMock = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    passwordService = new PasswordService();

    authService = new AuthService(
      prismaMock as unknown as PrismaService,
      passwordService,
      auditLogMock as unknown as AuditLogService,
    );
  });

  describe('register', () => {
    it('creates new user as TENANT_USER and creates a session', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const fakeUser = {
        id: 'u1',
        email: 'user@opentax.it',
        name: 'User',
        role: UserRole.TENANT_USER,
        memberships: [],
      };
      prismaMock.user.create.mockResolvedValue(fakeUser);

      const fakeSession = {
        id: 's1',
        tokenHash: 'somehash',
        userId: 'u1',
        activeTenantId: null,
        expiresAt: new Date(Date.now() + 100000),
      };
      prismaMock.session.create.mockResolvedValue(fakeSession);

      const res = await authService.register({
        email: 'User@OpenTax.it',
        password: 'password123',
        name: 'User',
      });

      expect(res.user.email).toBe('user@opentax.it');
      expect(res.user.role).toBe(UserRole.TENANT_USER);
      expect(res.token).toHaveLength(64);
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(auditLogMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_REGISTER', userId: 'u1' }),
      );
    });

    it('assigns PLATFORM_ADMIN role when matching setupToken is provided', async () => {
      process.env.SETUP_TOKEN = 'super-secret-token';
      prismaMock.user.findUnique.mockResolvedValue(null);

      const fakeUser = {
        id: 'u-admin',
        email: 'admin@opentax.it',
        name: 'Admin',
        role: UserRole.PLATFORM_ADMIN,
        memberships: [],
      };
      prismaMock.user.create.mockResolvedValue(fakeUser);

      const fakeSession = {
        id: 's-admin',
        tokenHash: 'hash',
        userId: 'u-admin',
        activeTenantId: null,
        expiresAt: new Date(Date.now() + 100000),
      };
      prismaMock.session.create.mockResolvedValue(fakeSession);

      const res = await authService.register({
        email: 'admin@opentax.it',
        password: 'password123',
        setupToken: 'super-secret-token',
      });

      expect(res.user.role).toBe(UserRole.PLATFORM_ADMIN);
      expect(prismaMock.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: UserRole.PLATFORM_ADMIN }),
        }),
      );
      delete process.env.SETUP_TOKEN;
    });

    it('rejects duplicate email', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        authService.register({
          email: 'user@opentax.it',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException on concurrent registration with same email (P2002)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '7.10.0',
        }),
      );

      await expect(
        authService.register({
          email: 'dup@opentax.it',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('logs in with correct password and returns session', async () => {
      const password = 'mypassword123';
      const passwordHash = await passwordService.hash(password);

      const user = {
        id: 'u1',
        email: 'user@test.it',
        passwordHash,
        role: UserRole.TENANT_USER,
        tenantId: 't1',
        memberships: [
          {
            id: 'm1',
            tenantId: 't1',
            role: UserRole.TENANT_USER,
            tenant: { id: 't1', name: 'Tenant 1' },
          },
        ],
      };
      prismaMock.user.findUnique.mockResolvedValue(user);

      const fakeSession = {
        id: 's1',
        tokenHash: 'hash',
        userId: 'u1',
        activeTenantId: 't1',
        expiresAt: new Date(Date.now() + 100000),
      };
      prismaMock.session.create.mockResolvedValue(fakeSession);

      const res = await authService.login({
        email: 'user@test.it',
        password,
      });

      expect(res.user.id).toBe('u1');
      expect(res.user.activeTenantId).toBe('t1');
      expect(res.token).toHaveLength(64);
      expect(auditLogMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_LOGIN_SUCCESS', userId: 'u1' }),
      );
    });

    it('rejects invalid password and logs failure', async () => {
      const passwordHash = await passwordService.hash('correct_password');
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'user@test.it',
        passwordHash,
      });

      await expect(
        authService.login({
          email: 'user@test.it',
          password: 'wrong_password',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(auditLogMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_LOGIN_FAILED' }),
      );
    });

    it('rejects non-existent user and logs failure with constant-time dummy verification', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const verifySpy = vi.spyOn(passwordService, 'verify');

      await expect(
        authService.login({
          email: 'notfound@test.it',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(verifySpy).toHaveBeenCalled();
      expect(auditLogMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_LOGIN_FAILED' }),
      );
    });
  });

  describe('selectTenant', () => {
    it('switches active tenant if user is a member', async () => {
      const user = {
        id: 'u1',
        email: 'user@test.it',
        role: UserRole.TENANT_USER,
        memberships: [
          {
            id: 'm1',
            tenantId: 't1',
            role: UserRole.TENANT_USER,
            tenant: { id: 't1', name: 'Tenant 1' },
          },
          {
            id: 'm2',
            tenantId: 't2',
            role: UserRole.TENANT_USER,
            tenant: { id: 't2', name: 'Tenant 2' },
          },
        ],
      };
      prismaMock.user.findUnique.mockResolvedValue(user);
      prismaMock.tenant.findUnique.mockResolvedValue({ id: 't2', name: 'Tenant 2' });
      prismaMock.session.updateMany.mockResolvedValue({ count: 1 });

      const res = await authService.selectTenant('u1', 'validtoken', 't2');
      expect(res.activeTenantId).toBe('t2');
      expect(auditLogMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'AUTH_SELECT_TENANT', tenantId: 't2' }),
      );
    });

    it('rejects switching to a tenant the user is not a member of', async () => {
      const user = {
        id: 'u1',
        email: 'user@test.it',
        role: UserRole.TENANT_USER,
        memberships: [
          {
            id: 'm1',
            tenantId: 't1',
            role: UserRole.TENANT_USER,
            tenant: { id: 't1', name: 'Tenant 1' },
          },
        ],
      };
      prismaMock.user.findUnique.mockResolvedValue(user);

      await expect(
        authService.selectTenant('u1', 'validtoken', 'unauthorized_tenant'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validateSession', () => {
    it('returns null if session is expired', async () => {
      prismaMock.session.findUnique.mockResolvedValue({
        id: 's1',
        tokenHash: 'h',
        expiresAt: new Date(Date.now() - 1000), // in the past
      });

      const res = await authService.validateSession('token');
      expect(res).toBeNull();
    });

    it('returns user and session if session is active and user is a member of the active tenant', async () => {
      const now = new Date();
      const fakeSession = {
        id: 's1',
        userId: 'u1',
        activeTenantId: 't1',
        expiresAt: new Date(now.getTime() + 100000),
        user: {
          id: 'u1',
          email: 'user@test.it',
          role: UserRole.TENANT_USER,
          memberships: [
            {
              id: 'm1',
              tenantId: 't1',
              role: UserRole.TENANT_USER,
              tenant: { id: 't1', name: 'T1' },
            },
          ],
        },
      };
      prismaMock.session.findUnique.mockResolvedValue(fakeSession);

      const res = await authService.validateSession('token');
      expect(res).not.toBeNull();
      expect(res?.user.id).toBe('u1');
      expect(res?.session.activeTenantId).toBe('t1');
    });

    it('resets activeTenantId to null if user is not a member of the active tenant', async () => {
      const now = new Date();
      const fakeSession = {
        id: 's1',
        userId: 'u1',
        activeTenantId: 'unauthorized_tenant',
        expiresAt: new Date(now.getTime() + 100000),
        user: {
          id: 'u1',
          email: 'user@test.it',
          role: UserRole.TENANT_USER,
          memberships: [
            {
              id: 'm1',
              tenantId: 'other_tenant',
              role: UserRole.TENANT_USER,
              tenant: { id: 'other_tenant', name: 'Other' },
            },
          ],
        },
      };
      prismaMock.session.findUnique.mockResolvedValue(fakeSession);

      const res = await authService.validateSession('token');
      expect(res).not.toBeNull();
      expect(res?.user.id).toBe('u1');
      expect(res?.session.activeTenantId).toBeNull();
    });
  });
});
