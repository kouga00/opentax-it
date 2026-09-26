import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AvailableCredit, CreditUse } from '@opentax-it/fiscal-rules';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateTaxCreditDto } from './tax-credits.dto.js';

/**
 * Credits usable in F24 and their uses (one TaxCreditUsage per credit row of a form).
 * Sources: Redditi PF 2026 instructions, booklet 1, §8 "La compensazione"; booklet 2, RR8
 * col. 2 (INPS credit usable only in F24 with the reference year); booklet 3, LM47.
 */
@Injectable()
export class TaxCreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    const rows = await this.prisma.taxCredit.findMany({ where: { tenantId }, include: { usages: { include: { f24Line: { include: { f24: { select: { id: true, paymentDate: true, status: true } } } } } } }, orderBy: [{ referenceYear: 'desc' }, { createdAt: 'asc' }] });
    return rows.map((c) => {
      const used = round2(c.usages.reduce((s, u) => s + Number(u.amount), 0));
      return { ...c, used, remaining: round2(Number(c.amount) - used) };
    });
  }

  /**
   * Credits with a remaining amount, in the order they were entered (oldest reference year first). With
   * `date`, credits whose "usable from" date is later are left out (e.g. above EUR 5,000: from the tenth
   * day after the return is filed, art. 3 D.Lgs. 33/2025).
   */
  async available(tenantId: string, date?: Date): Promise<AvailableCredit[]> {
    const rows = await this.list(tenantId);
    return rows
      .filter((c) => c.remaining > 0 && (!date || !c.usableFrom || c.usableFrom.getTime() <= date.getTime()))
      .sort((a, b) => a.referenceYear - b.referenceYear || a.createdAt.getTime() - b.createdAt.getTime())
      .map((c) => ({ id: c.id, section: c.section, code: c.code, referenceYear: c.referenceYear, amount: c.remaining, localCode: c.localCode ?? undefined, installmentCode: c.installmentCode ?? undefined, description: c.description ?? undefined }));
  }

  async get(tenantId: string, id: string) {
    const credit = (await this.list(tenantId)).find((c) => c.id === id);
    if (!credit) throw new NotFoundException('Credit not found');
    return credit;
  }

  create(tenantId: string, dto: CreateTaxCreditDto) {
    return this.prisma.taxCredit.create({ data: { tenantId, ...fields(dto) } });
  }

  /** Like deletion, allowed only while no F24 uses the credit: its rows would no longer match. */
  async update(tenantId: string, id: string, dto: CreateTaxCreditDto) {
    await this.unused(tenantId, id);
    return this.prisma.taxCredit.update({ where: { id }, data: fields(dto) });
  }

  async remove(tenantId: string, id: string) {
    await this.unused(tenantId, id);
    await this.prisma.taxCredit.delete({ where: { id } });
  }

  /** Credit amounts already used in the tenant's F24 forms, by credit code and reference year. */
  async earlierUses(tenantId: string): Promise<CreditUse[]> {
    const rows = await this.prisma.taxCreditUsage.findMany({
      where: { taxCredit: { tenantId } },
      select: { amount: true, taxCredit: { select: { id: true, section: true, code: true, referenceYear: true } } },
    });
    return rows.map((r) => ({ creditId: r.taxCredit.id, section: r.taxCredit.section, code: r.taxCredit.code, referenceYear: r.taxCredit.referenceYear, amount: Number(r.amount) }));
  }

  private async unused(tenantId: string, id: string) {
    const credit = await this.prisma.taxCredit.findFirst({ where: { id, tenantId }, include: { usages: true } });
    if (!credit) throw new NotFoundException('Credit not found');
    if (credit.usages.length > 0) throw new ConflictException('The credit is used in an F24: delete that plan first');
  }
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function fields(dto: CreateTaxCreditDto) {
  return {
    section: dto.section,
    code: dto.code,
    referenceYear: dto.referenceYear,
    amount: dto.amount,
    localCode: dto.localCode || null,
    installmentCode: dto.installmentCode || null,
    usableFrom: dto.usableFrom ? new Date(`${dto.usableFrom}T00:00:00Z`) : null,
    description: dto.description || null,
    notes: dto.notes || null,
  };
}
