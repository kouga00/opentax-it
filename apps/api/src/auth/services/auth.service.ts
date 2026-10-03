import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { AuditLogService } from '../../audit-log/services/audit-log.service.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { LoginDto } from '../dto/request/login.dto.js';
import type { AuthResponseDto } from '../dto/response/auth-response.dto.js';
import type { UserResponseDto } from '../dto/response/user-response.dto.js';
import { AuthMapper } from '../mappers/auth.mapper.js';
import type { UserWithMemberships } from '../types/user-with-memberships.js';
import { PasswordService } from './password.service.js';

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Hashes a raw session token using SHA-256 for safe storage at rest.
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          orderBy: { createdAt: 'asc' },
          include: {
            tenant: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      // Same time as a known email, so the response does not reveal who has an account.
      await this.passwordService.verifyDummy(dto.password);
      await this.auditLog.log({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        data: { email, reason: 'user_not_found', ip: ipAddress },
      });
      throw new UnauthorizedException('Credenziali non valide');
    }

    const isValid = await this.passwordService.verify(dto.password, user.passwordHash);
    if (!isValid) {
      await this.auditLog.log({
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        data: { email, reason: 'invalid_password', ip: ipAddress },
      });
      throw new UnauthorizedException('Credenziali non valide');
    }

    // Pick active tenant: first tenant membership or legacy user.tenantId
    const activeTenantId = user.memberships[0]?.tenantId ?? user.tenantId ?? null;

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

    const session = await this.prisma.session.create({
      data: {
        tokenHash,
        userId: user.id,
        activeTenantId,
        expiresAt,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });

    await this.auditLog.log({
      userId: user.id,
      tenantId: activeTenantId,
      action: 'AUTH_LOGIN_SUCCESS',
      entityType: 'Session',
      entityId: session.id,
      data: { email: user.email, ip: ipAddress },
    });

    return AuthMapper.toAuthResponse(token, session, user);
  }

  async logout(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const session = await this.prisma.session.findUnique({ where: { tokenHash } });
    if (session) {
      await this.prisma.session.delete({ where: { id: session.id } });
      await this.auditLog.log({
        userId: session.userId,
        tenantId: session.activeTenantId,
        action: 'AUTH_LOGOUT',
        entityType: 'Session',
        entityId: session.id,
      });
    }
  }

  async validateSession(token: string): Promise<{
    user: UserWithMemberships;
    session: { id: string; userId: string; activeTenantId: string | null; expiresAt: Date };
  } | null> {
    const tokenHash = this.hashToken(token);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: {
              orderBy: { createdAt: 'asc' },
              include: {
                tenant: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt < new Date()) {
      this.prisma.session.delete({ where: { id: session.id } })?.catch((err: unknown) => {
        this.logger.warn(`Failed to clean up expired session ${session.id}:`, err);
      });
      return null;
    }

    let activeTenantId = session.activeTenantId;
    if (activeTenantId && session.user.role !== UserRole.PLATFORM_ADMIN) {
      const isMember = session.user.memberships.some((m) => m.tenantId === activeTenantId);
      if (!isMember) {
        activeTenantId = null;
      }
    }

    return {
      user: session.user,
      session: {
        id: session.id,
        userId: session.userId,
        activeTenantId,
        expiresAt: session.expiresAt,
      },
    };
  }

  async selectTenant(
    userId: string,
    token: string,
    tenantId: string,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          orderBy: { createdAt: 'asc' },
          include: {
            tenant: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    // Check membership or platform admin privilege
    const isMember = user.memberships.some((m) => m.tenantId === tenantId);
    if (!isMember && user.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Non hai accesso a questa partita IVA');
    }

    // Verify tenant exists
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new BadRequestException('Partita IVA non trovata');
    }

    const tokenHash = this.hashToken(token);
    await this.prisma.session.updateMany({
      where: { tokenHash, userId },
      data: { activeTenantId: tenantId },
    });

    await this.auditLog.log({
      userId,
      tenantId,
      action: 'AUTH_SELECT_TENANT',
      entityType: 'Tenant',
      entityId: tenantId,
    });

    return AuthMapper.toUserResponse(user, tenantId);
  }

  async getMe(userId: string, activeTenantId?: string | null): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          orderBy: { createdAt: 'asc' },
          include: {
            tenant: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Utente non trovato');
    }

    return AuthMapper.toUserResponse(user, activeTenantId);
  }
}
