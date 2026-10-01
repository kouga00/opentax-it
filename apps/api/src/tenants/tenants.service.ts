import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { termsLabel } from '../common/payment-schedule.js';
import { createHash } from 'node:crypto';
import { PROFESSIONAL_FUND_TYPES, SOCIAL_SECURITY_FUNDS } from '@opentax-it/fatturapa';
import { contributionScheme, INPS_OFFICES, isValidInpsOfficeIdForGestioneSeparata } from '@opentax-it/fiscal-rules';
import { AuditLogService } from '../audit-log/services/audit-log.service.js';
import { type SocialSecurityScheme, UserRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { BankAccountDto, CreateTenantDto, PaymentTermsDto, UpdateTenantProfileDto } from './tenants.dto.js';

/** Encrypted secrets never leave the API, not even encrypted (OWASP API3:2023): this module still returns entities. */
const PROFILE_WITHOUT_SECRETS = { profile: { omit: { pecPasswordEnc: true, ibanEnc: true } } } as const;

@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateTenantDto, userId?: string, sessionToken?: string) {
    const { name, ...profile } = dto;
    if (profile.inpsOfficeId !== undefined && !isValidInpsOfficeIdForGestioneSeparata(profile.inpsOfficeId)) {
      throw new BadRequestException('Sede INPS sconosciuta (vedi la "Tabella codici sede INPS" dell\'Agenzia delle Entrate)');
    }
    const tenant = await this.prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: {
          name,
          profile: { create: { ...profile, ...personalData(profile), applyInpsSurcharge: surchargeAllowed(profile.socialSecurityScheme ?? 'INPS_SEPARATE', profile.applyInpsSurcharge) } },
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
        include: PROFILE_WITHOUT_SECRETS,
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
    const { profile: current } = await this.getWithProfile(tenantId);
    const { name, ...profile } = dto;
    if (profile.inpsOfficeId !== undefined && profile.inpsOfficeId !== '' && !isValidInpsOfficeIdForGestioneSeparata(profile.inpsOfficeId)) {
      throw new BadRequestException('Sede INPS sconosciuta (vedi la "Tabella codici sede INPS" dell\'Agenzia delle Entrate)');
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
            applyInpsSurcharge: surchargeAllowed(profile.socialSecurityScheme ?? current.socialSecurityScheme, profile.applyInpsSurcharge ?? current.applyInpsSurcharge),
          },
        },
      },
      include: PROFILE_WITHOUT_SECRETS,
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
        if (!existing) throw new NotFoundException('Conto bancario non trovato');
        return tx.bankAccount.update({ where: { id }, data });
      }
      return tx.bankAccount.create({ data: { tenantId, ...data } });
    });
  }

  async deleteBankAccount(tenantId: string, id: string) {
    const existing = await this.prisma.bankAccount.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Conto bancario non trovato');
    const used = await this.prisma.invoice.count({ where: { bankAccountId: id } });
    if (used) throw new BadRequestException('Il conto è indicato in alcune fatture e non si può eliminare');
    await this.prisma.bankAccount.delete({ where: { id } });
  }

  /** Payment terms with their "30/60 gg fine mese" label (common/payment-schedule.ts). */
  async listPaymentTerms(tenantId: string) {
    const rows = await this.prisma.paymentTerms.findMany({ where: { tenantId }, orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] });
    return rows.map((t) => ({ ...t, label: termsLabel(t) }));
  }

  async savePaymentTerms(tenantId: string, dto: PaymentTermsDto, id?: string) {
    const { name, method, isDefault } = dto;
    // Installments in increasing order, each date after the previous one.
    const dueDays = [...new Set(dto.dueDays)].sort((a, b) => a - b);
    const data = { name, dueDays, fromMonthEnd: dto.fromMonthEnd ?? false, method: method ?? 'MP05', isDefault: isDefault ?? false };
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) await tx.paymentTerms.updateMany({ where: { tenantId, isDefault: true }, data: { isDefault: false } });
      if (id) {
        const existing = await tx.paymentTerms.findFirst({ where: { id, tenantId } });
        if (!existing) throw new NotFoundException('Profilo di scadenza non trovato');
        return tx.paymentTerms.update({ where: { id }, data });
      }
      return tx.paymentTerms.create({ data: { tenantId, ...data } });
    });
  }

  async deletePaymentTerms(tenantId: string, id: string) {
    const existing = await this.prisma.paymentTerms.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Profilo di scadenza non trovato');
    await this.prisma.paymentTerms.delete({ where: { id } });
  }

  /** INPS offices accepting Gestione Separata contributions, for form selects (one entry per published row). */
  inpsOffices() {
    return INPS_OFFICES.filter((o) => o.otherContributions).map(({ id, code, name }) => ({ id, code, name }));
  }

  /** Professional funds (TipoCassa TC01-TC21 of the FatturaPA schema), for form selects. */
  professionalFunds() {
    return PROFESSIONAL_FUND_TYPES.map((code) => ({ code, name: SOCIAL_SECURITY_FUNDS[code] }));
  }

  async getWithProfile(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, include: PROFILE_WITHOUT_SECRETS });
    if (!tenant?.profile) throw new NotFoundException('Partita IVA non trovata o senza profilo fiscale');
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

/**
 * The profile's INPS surcharge, switched off for schemes that do not grant it: the 4% surcharge is for the
 * Gestione Separata only (L. 662/1996 art. 1 par. 212; contribution-schemes.ts).
 */
function surchargeAllowed(scheme: SocialSecurityScheme, requested: boolean | undefined): boolean {
  return (requested ?? false) && contributionScheme(scheme)?.inpsSurcharge === true;
}
