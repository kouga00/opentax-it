import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogService } from '../../audit-log/services/audit-log.service.js';
import { AuthService } from '../../auth/services/auth.service.js';
import { PasswordService } from '../../auth/services/password.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateUserDto } from '../dto/request/create-user.dto.js';
import type { MembershipDto } from '../dto/request/membership.dto.js';
import type { UpdateUserDto } from '../dto/request/update-user.dto.js';
import type { UserAccount } from '../types/user-account.js';

const WITH_MEMBERSHIPS = { memberships: { include: { tenant: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } } } as const;

/**
 * Users and their access to the VAT numbers, managed only by the platform admin: there is no self-registration
 * (the first admin is created with `pnpm admin:create`). The admin chooses the password of a new user.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly auth: AuthService,
    private readonly auditLog: AuditLogService,
  ) {}

  list(): Promise<UserAccount[]> {
    return this.prisma.user.findMany({ include: WITH_MEMBERSHIPS, orderBy: { email: 'asc' } });
  }

  async create(actorId: string, dto: CreateUserDto): Promise<UserAccount> {
    const passwordHash = await this.passwords.hash(dto.password);
    try {
      const user = await this.prisma.user.create({
        data: { email: dto.email.trim().toLowerCase(), name: dto.name?.trim() || null, passwordHash, role: dto.role },
        include: WITH_MEMBERSHIPS,
      });
      await this.auditLog.log({ userId: actorId, action: 'USER_CREATED', entityType: 'User', entityId: user.id, data: { role: user.role } });
      return user;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw new ConflictException('Esiste già un utente con questa email');
      throw err;
    }
  }

  /** A new password closes the user's sessions, except the one of an admin changing its own. */
  async update(actorId: string, sessionToken: string, id: string, dto: UpdateUserDto): Promise<UserAccount> {
    const user = await this.find(id);
    if (id === actorId && dto.role && dto.role !== UserRole.PLATFORM_ADMIN) {
      throw new BadRequestException('Non puoi togliere a te stesso il ruolo di amministratore');
    }
    const passwordHash = dto.password ? await this.passwords.hash(dto.password) : undefined;
    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.user.update({
        where: { id: user.id },
        data: { ...(dto.name !== undefined ? { name: dto.name.trim() || null } : {}), ...(dto.role ? { role: dto.role } : {}), ...(passwordHash ? { passwordHash } : {}) },
        include: WITH_MEMBERSHIPS,
      });
      if (passwordHash) {
        await tx.session.deleteMany({ where: { userId: user.id, ...(id === actorId ? { tokenHash: { not: this.auth.hashToken(sessionToken) } } : {}) } });
      }
      return saved;
    });
    await this.auditLog.log({ userId: actorId, action: 'USER_UPDATED', entityType: 'User', entityId: id, data: { role: updated.role, passwordChanged: Boolean(passwordHash) } });
    return updated;
  }

  async remove(actorId: string, id: string): Promise<void> {
    if (id === actorId) throw new BadRequestException('Non puoi eliminare il tuo utente');
    await this.find(id);
    // Sessions and memberships go with the user (ON DELETE CASCADE).
    await this.prisma.user.delete({ where: { id } });
    await this.auditLog.log({ userId: actorId, action: 'USER_DELETED', entityType: 'User', entityId: id });
  }

  /** Replaces the VAT numbers the user can access; a session on a VAT number no longer allowed loses it (AuthService.validateSession). */
  async setMemberships(actorId: string, id: string, memberships: MembershipDto[]): Promise<UserAccount> {
    await this.find(id);
    const tenantIds = [...new Set(memberships.map((m) => m.tenantId))];
    if (tenantIds.length !== memberships.length) throw new BadRequestException('Ogni partita IVA può comparire una sola volta');
    const found = await this.prisma.tenant.count({ where: { id: { in: tenantIds } } });
    if (found !== tenantIds.length) throw new BadRequestException('Partita IVA non trovata');
    const user = await this.prisma.$transaction(async (tx) => {
      await tx.tenantMember.deleteMany({ where: { userId: id } });
      if (memberships.length > 0) await tx.tenantMember.createMany({ data: memberships.map((m) => ({ userId: id, tenantId: m.tenantId, role: m.role })) });
      return tx.user.findUniqueOrThrow({ where: { id }, include: WITH_MEMBERSHIPS });
    });
    await this.auditLog.log({ userId: actorId, action: 'USER_MEMBERSHIPS_SET', entityType: 'User', entityId: id, data: { memberships: memberships.map((m) => ({ tenantId: m.tenantId, role: m.role })) } });
    return user;
  }

  private async find(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('Utente non trovato');
    return user;
  }
}
