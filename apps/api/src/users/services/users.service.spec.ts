import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditLogService } from '../../audit-log/services/audit-log.service.js';
import type { AuthService } from '../../auth/services/auth.service.js';
import type { PasswordService } from '../../auth/services/password.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { UserRole } from '../../generated/prisma/enums.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from './users.service.js';

function setup() {
  const tx = {
    user: { update: vi.fn().mockResolvedValue({ id: 'u2', role: UserRole.TENANT_USER, memberships: [] }), findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'u2', memberships: [] }) },
    session: { deleteMany: vi.fn() },
    tenantMember: { deleteMany: vi.fn(), createMany: vi.fn() },
  };
  const prisma = {
    user: { create: vi.fn(), findUnique: vi.fn().mockResolvedValue({ id: 'u2' }), delete: vi.fn() },
    tenant: { count: vi.fn() },
    $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
  };
  const passwords = { hash: vi.fn().mockResolvedValue('hash') } as unknown as PasswordService;
  const auth = { hashToken: (t: string) => `h:${t}` } as unknown as AuthService;
  const auditLog = { log: vi.fn() } as unknown as AuditLogService;
  return { tx, prisma, service: new UsersService(prisma as unknown as PrismaService, passwords, auth, auditLog) };
}

describe('UsersService', () => {
  it('creates a user with the password chosen by the admin, and refuses a used email', async () => {
    const { prisma, service } = setup();
    prisma.user.create.mockResolvedValueOnce({ id: 'u2', role: UserRole.TENANT_USER, memberships: [] });
    await service.create('admin', { email: ' Studio@Example.com ', password: 'password123', role: UserRole.TENANT_USER });
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: { email: 'studio@example.com', name: null, passwordHash: 'hash', role: UserRole.TENANT_USER } }));

    prisma.user.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }));
    await expect(service.create('admin', { email: 'studio@example.com', password: 'password123', role: UserRole.TENANT_USER })).rejects.toThrow(ConflictException);
  });

  it('closes the sessions of a user whose password changes, keeping the admin\'s own current session', async () => {
    const { tx, service } = setup();
    await service.update('admin', 'tok', 'u2', { password: 'newpassword' });
    expect(tx.session.deleteMany).toHaveBeenLastCalledWith({ where: { userId: 'u2' } });
    await service.update('u2', 'tok', 'u2', { password: 'newpassword' });
    expect(tx.session.deleteMany).toHaveBeenLastCalledWith({ where: { userId: 'u2', tokenHash: { not: 'h:tok' } } });
  });

  it('does not let the admin demote or delete itself', async () => {
    const { service } = setup();
    await expect(service.update('u2', 'tok', 'u2', { role: UserRole.TENANT_USER })).rejects.toThrow(BadRequestException);
    await expect(service.remove('u2', 'u2')).rejects.toThrow(BadRequestException);
  });

  it('replaces the memberships, refusing duplicates and unknown VAT numbers', async () => {
    const { tx, prisma, service } = setup();
    await expect(service.setMemberships('admin', 'u2', [{ tenantId: 't1', role: UserRole.TENANT_USER }, { tenantId: 't1', role: UserRole.TENANT_ADMIN }])).rejects.toThrow(BadRequestException);
    prisma.tenant.count.mockResolvedValueOnce(0);
    await expect(service.setMemberships('admin', 'u2', [{ tenantId: 'tx', role: UserRole.TENANT_USER }])).rejects.toThrow(BadRequestException);
    prisma.tenant.count.mockResolvedValueOnce(1);
    await service.setMemberships('admin', 'u2', [{ tenantId: 't1', role: UserRole.TENANT_USER }]);
    expect(tx.tenantMember.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u2' } });
    expect(tx.tenantMember.createMany).toHaveBeenCalledWith({ data: [{ userId: 'u2', tenantId: 't1', role: UserRole.TENANT_USER }] });
  });
});
