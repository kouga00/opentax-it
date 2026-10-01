import { describe, expect, it, vi } from 'vitest';
import { PasswordService } from '../auth/services/password.service.js';
import { UserRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { claimOrphanTenants, create, promote } from './create-admin.js';

describe('create-admin CLI', () => {
  it('creates a new PLATFORM_ADMIN user with hashed password', async () => {
    const mockPrisma = {
      user: {
        create: vi.fn().mockResolvedValue({ id: 'user-1', email: 'admin@example.com' }),
      },
      tenant: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      tenantMember: {
        create: vi.fn(),
      },
    };
    const mockPasswordService = {
      hash: vi.fn().mockResolvedValue('hashed_secret123'),
    };

    await create(
      mockPrisma as unknown as PrismaService,
      mockPasswordService as unknown as PasswordService,
      'admin@example.com',
      'secret123',
      'Admin User',
    );

    expect(mockPasswordService.hash).toHaveBeenCalledWith('secret123');
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'admin@example.com',
        passwordHash: 'hashed_secret123',
        name: 'Admin User',
        role: UserRole.PLATFORM_ADMIN,
      },
    });
  });

  it('rejects password shorter than 8 characters when creating admin', async () => {
    const mockPrisma = {
      user: {
        create: vi.fn(),
      },
      tenant: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const mockPasswordService = {
      hash: vi.fn(),
    };

    await expect(
      create(
        mockPrisma as unknown as PrismaService,
        mockPasswordService as unknown as PasswordService,
        'admin@example.com',
        'short',
      ),
    ).rejects.toThrow('Per creare un nuovo utente amministratore è richiesta una password di almeno 8 caratteri.');
  });

  it('promotes an existing user to PLATFORM_ADMIN and updates password if provided', async () => {
    const mockPrisma = {
      user: {
        update: vi.fn().mockResolvedValue({ id: 'user-existing', email: 'user@example.com' }),
      },
      tenant: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      tenantMember: {
        create: vi.fn(),
      },
    };
    const mockPasswordService = {
      hash: vi.fn().mockResolvedValue('hashed_newpass123'),
    };

    await promote(
      mockPrisma as unknown as PrismaService,
      mockPasswordService as unknown as PasswordService,
      { id: 'user-existing', email: 'user@example.com' },
      'newpass123',
      'Updated Name',
    );

    expect(mockPasswordService.hash).toHaveBeenCalledWith('newpass123');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-existing' },
      data: {
        role: UserRole.PLATFORM_ADMIN,
        passwordHash: 'hashed_newpass123',
        name: 'Updated Name',
      },
    });
  });

  it('promotes an existing user to PLATFORM_ADMIN without changing password if not provided', async () => {
    const mockPrisma = {
      user: {
        update: vi.fn().mockResolvedValue({ id: 'user-existing', email: 'user@example.com' }),
      },
      tenant: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      tenantMember: {
        create: vi.fn(),
      },
    };
    const mockPasswordService = {
      hash: vi.fn(),
    };

    await promote(
      mockPrisma as unknown as PrismaService,
      mockPasswordService as unknown as PasswordService,
      { id: 'user-existing', email: 'user@example.com' },
    );

    expect(mockPasswordService.hash).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-existing' },
      data: {
        role: UserRole.PLATFORM_ADMIN,
      },
    });
  });

  it('claims orphan tenants without members and assigns them to the admin', async () => {
    const mockPrisma = {
      tenant: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'orphan-1', name: 'Partita IVA 1' },
          { id: 'orphan-2', name: 'Partita IVA 2' },
        ]),
      },
      tenantMember: {
        create: vi.fn().mockResolvedValue({ id: 'tm-1' }),
      },
    };

    const claimed = await claimOrphanTenants(
      mockPrisma as unknown as PrismaService,
      { id: 'admin-1', email: 'admin@example.com' },
    );

    expect(claimed).toBe(2);
    expect(mockPrisma.tenantMember.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.tenantMember.create).toHaveBeenCalledWith({
      data: {
        userId: 'admin-1',
        tenantId: 'orphan-1',
        role: UserRole.TENANT_ADMIN,
      },
    });
  });
});
