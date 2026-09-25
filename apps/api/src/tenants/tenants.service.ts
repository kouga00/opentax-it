import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { INPS_OFFICES, isValidInpsOfficeIdForGestioneSeparata } from '@opentax-it/fiscal-rules';
import { AuditLogService } from '../audit-log/audit-log.service.js';
import { UserRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { BankAccountDto, CreateTenantDto, PaymentTermsDto, UpdateTenantProfileDto } from './tenants.dto.js';

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateTenantDto, userId?: string, sessionToken?: string) {
    const { name, ...profile } = dto;
    if (profile.inpsOfficeId !== undefined && !isValidInpsOfficeIdForGestioneSeparata(profile.inpsOfficeId)) {
      throw new BadRequestException('Unknown INPS office (see the AdE "Tabella codici sede INPS")');
    }

    const tenant = await this.prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: {
          name,
          profile: { create: { ...profile, ...personalData(profile) } },
          ...(userId
            ? {
                members: {
                  create: {
                    userId,
                    role: UserRole.TENANT_ADMIN,
                  },
                },
              }
            : {}),
        },
        include: { profile: true },
      });

      if (sessionToken && userId) {
        const tokenHash = createHash('sha256').update(sessionToken).digest('hex');
        await tx.session.updateMany({
          where: { tokenHash, userId },
          data: { activeTenantId: created.id },
        });
      }

      return created;
    });

    await this.auditLog.log({
      tenantId: tenant.id,
      userId: userId ?? null,
      action: 'TENANT_CREATE',
      entityType: 'Tenant',
      entityId: tenant.id,
      data: { name: tenant.name },
    });

    return tenant;
  }

  async updateProfile(tenantId: string, dto: UpdateTenantProfileDto) {
    await this.getWithProfile(tenantId);
    const { name, ...profile } = dto;
    if (profile.inpsOfficeId !== undefined && profile.inpsOfficeId !== '' && !isValidInpsOfficeIdForGestioneSeparata(profile.inpsOfficeId)) {
      throw new BadRequestException('Unknown INPS office (see the AdE "Tabella codici sede INPS")');
    }
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(name ? { name } : {}),
        profile: {
          update: {
            ...profile,
            ...personalData(profile),
            inpsOfficeId: profile.inpsOfficeId === '' ? null : profile.inpsOfficeId,
          },
        },
      },
      include: { profile: true },
    });
  }

  listBankAccounts(tenantId: string) {
    return this.prisma.bankAccount.findMany({ where: { tenantId }, orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] });
  }

  async saveBankAccount(tenantId: string, dto: BankAccountDto, id?: string) {
    const { name, bankName, iban, bic, isDefault } = dto;
    const data = { name, bankName: bankName || null, iban, bic: bic || null, isDefault: isDefault ?? false };
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) await tx.bankAccount.updateMany({ where: { tenantId, isDefault: true }, data: { isDefault: false } });
      if (id) {
        const existing = await tx.bankAccount.findFirst({ where: { id, tenantId } });
        if (!existing) throw new NotFoundException(`Bank account ${id} not found`);
        return tx.bankAccount.update({ where: { id }, data });
      }
      return tx.bankAccount.create({ data: { tenantId, ...data } });
    });
  }

  async deleteBankAccount(tenantId: string, id: string) {
    const existing = await this.prisma.bankAccount.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException(`Bank account ${id} not found`);
    const used = await this.prisma.invoice.count({ where: { bankAccountId: id } });
    if (used) throw new BadRequestException('Bank account is used by invoices and cannot be deleted');
    await this.prisma.bankAccount.delete({ where: { id } });
  }

  listPaymentTerms(tenantId: string) {
    return this.prisma.paymentTerms.findMany({ where: { tenantId }, orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] });
  }

  async savePaymentTerms(tenantId: string, dto: PaymentTermsDto, id?: string) {
    const { name, days, method, isDefault } = dto;
    const data = { name, days, method: method ?? 'MP05', isDefault: isDefault ?? false };
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) await tx.paymentTerms.updateMany({ where: { tenantId, isDefault: true }, data: { isDefault: false } });
      if (id) {
        const existing = await tx.paymentTerms.findFirst({ where: { id, tenantId } });
        if (!existing) throw new NotFoundException(`Payment terms ${id} not found`);
        return tx.paymentTerms.update({ where: { id }, data });
      }
      return tx.paymentTerms.create({ data: { tenantId, ...data } });
    });
  }

  async deletePaymentTerms(tenantId: string, id: string) {
    const existing = await this.prisma.paymentTerms.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException(`Payment terms ${id} not found`);
    await this.prisma.paymentTerms.delete({ where: { id } });
  }

  /** INPS offices accepting Gestione Separata contributions, for form selects (one entry per published row). */
  inpsOffices() {
    return INPS_OFFICES.filter((o) => o.otherContributions).map(({ id, code, name }) => ({ id, code, name }));
  }

  async getWithProfile(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, include: { profile: true } });
    if (!tenant?.profile) throw new NotFoundException(`Tenant ${tenantId} not found or without a fiscal profile`);
    return { ...tenant, profile: tenant.profile };
  }

  list(userId?: string, userRole?: string) {
    const where =
      userId && userRole !== UserRole.PLATFORM_ADMIN
        ? {
            OR: [
              { members: { some: { userId } } },
              { users: { some: { id: userId } } },
            ],
          }
        : undefined;

    return this.prisma.tenant.findMany({
      where,
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}

/** Birth data as stored: empty strings become null, the date becomes a Date (UTC midnight). */
function personalData(p: { birthDate?: string; sex?: string; birthPlace?: string; birthProvince?: string }) {
  const out: { birthDate?: Date | null; sex?: string | null; birthPlace?: string | null; birthProvince?: string | null } = {};
  if (p.birthDate !== undefined) out.birthDate = p.birthDate ? new Date(`${p.birthDate}T00:00:00Z`) : null;
  if (p.sex !== undefined) out.sex = p.sex || null;
  if (p.birthPlace !== undefined) out.birthPlace = p.birthPlace || null;
  if (p.birthProvince !== undefined) out.birthProvince = p.birthProvince || null;
  return out;
}
