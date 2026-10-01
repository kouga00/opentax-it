import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { parseIsoDate, stampDutyF24Line } from '@opentax-it/fiscal-rules';
import { todayInItaly } from '../../common/italian-date.js';
import { FiscalRulesService } from '../../fiscal-rules/fiscal-rules.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateStampDutyF24Dto } from '../dto/request/create-stamp-duty-f24.dto.js';
import type { StampDutyPaymentDto } from '../dto/request/stamp-duty-payment.dto.js';
import type { SavedF24 } from '../types/saved-f24.js';
import type { StampDutyQuarter } from '../types/stamp-duty-quarter.js';

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
/** YYYY-MM-DD as the user reads it, DD/MM/YYYY. */
const italianDate = (iso: string) => iso.split('-').reverse().join('/');

/**
 * Payment of the stamp duty on e-invoices, quarter by quarter (AdE stamp duty guide, June 2026, §3-4): the AdE computes
 * the amount from lists A and B and shows it on the "Fatture e corrispettivi" portal; it is paid there with a debit on
 * the taxpayer's IBAN or "tramite modello F24, da presentarsi in modalità telematica" (the F24 row in
 * packages/fiscal-rules, stamp-duty.ts). The app's estimate from the invoices helps to check list B; the amount paid is
 * the AdE's, saved in StampDutyPeriod.
 */
@Injectable()
export class StampDutyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rules: FiscalRulesService,
  ) {}

  async list(tenantId: string, year: number): Promise<StampDutyQuarter[]> {
    const [rules, deadlines, computed, periods] = await Promise.all([
      this.rules.getActive(year),
      this.rules.deadlines(year, {}, tenantId),
      this.rules.stampDutyByQuarter(tenantId, year),
      this.prisma.stampDutyPeriod.findMany({ where: { tenantId, year }, include: { f24: { select: { id: true, status: true, paymentDate: true, paidOn: true } } } }),
    ]);
    return rules.stampDuty.deadlines
      .map((s) => {
        const deadline = deadlines.find((d) => d.kind === 'STAMP_DUTY' && d.details.quarter === s.quarter);
        const period = periods.find((p) => p.quarter === s.quarter);
        // A cancelled form no longer pays the quarter.
        const f24 = period?.f24 && period.f24.status !== 'CANCELLED' ? period.f24 : null;
        return {
          year,
          quarter: s.quarter,
          taxCode: s.taxCode,
          estimatedAmount: computed.amounts[s.quarter as 1 | 2 | 3 | 4],
          estimated: computed.estimatedQuarters.includes(s.quarter),
          dueAmount: period?.dueAmount != null ? Number(period.dueAmount) : null,
          paymentDeadline: deadline?.date ?? s.date,
          deferredFrom: deadline?.details.deferredFrom ?? null,
          listBChangesBy: s.listBChangesBy ?? null,
          amountAvailableOn: s.amountAvailableOn ?? null,
          f24: f24 ? { id: f24.id, status: f24.status, paymentDate: isoDate(f24.paymentDate), paidOn: f24.paidOn ? isoDate(f24.paidOn) : null } : null,
          paidOnPortal: period?.paidOn ? isoDate(period.paidOn) : null,
        };
      })
      .sort((a, b) => a.quarter - b.quarter);
  }

  /** The F24 of a quarter with the amount of the AdE, due by the deadline of the quarter. */
  async createF24(tenantId: string, year: number, quarter: number, dto: CreateStampDutyF24Dto): Promise<SavedF24> {
    const q = await this.quarter(tenantId, year, quarter);
    if (q.paidOnPortal) throw new ConflictException(`Il bollo del ${quarter}° trimestre ${year} è già segnato come pagato dal portale`);
    if (q.f24) throw new ConflictException(`C'è già un F24 per il bollo del ${quarter}° trimestre ${year}: eliminalo prima di crearne un altro`);
    const paymentDate = dto.paymentDate ?? q.paymentDeadline;
    // A late payment also needs penalty (2525) and interest (2526): the portal computes them (AdE guide, §4).
    if (paymentDate > q.paymentDeadline) {
      throw new BadRequestException(`La scadenza del bollo del ${quarter}° trimestre è il ${italianDate(q.paymentDeadline)}: oltre servono anche sanzione e interessi del ravvedimento, che il portale Fatture e corrispettivi calcola da solo. Paga da lì e segna il trimestre come pagato dal portale.`);
    }
    const rules = await this.rules.getActive(year);
    let line: ReturnType<typeof stampDutyF24Line>;
    try {
      line = stampDutyF24Line(rules, quarter, dto.amount);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    return this.prisma.$transaction(async (tx) => {
      const f24 = await tx.f24.create({
        data: {
          tenantId,
          kind: 'STAMP_DUTY',
          paymentDate: parseIsoDate(paymentDate),
          totalDebit: line.debitAmount,
          balance: line.debitAmount,
          lines: {
            create: [{
              section: line.section,
              role: 'OTHER',
              code: line.code,
              referenceYear: line.referenceYear,
              debitAmount: line.debitAmount,
              description: `Imposta di bollo sulle fatture elettroniche, ${quarter}° trimestre ${year}`,
            }],
          },
        },
        include: { lines: true, plan: { select: { taxYear: true, installments: true } } },
      });
      await tx.stampDutyPeriod.upsert(this.periodUpsert(tenantId, q, { dueAmount: line.debitAmount, f24Id: f24.id }));
      return f24;
    });
  }

  /** A quarter paid with the debit from the portal, with the amount of the AdE. */
  async markPaidOnPortal(tenantId: string, year: number, quarter: number, dto: StampDutyPaymentDto): Promise<StampDutyQuarter> {
    const q = await this.quarter(tenantId, year, quarter);
    if (q.f24) throw new ConflictException(`Il bollo del ${quarter}° trimestre ${year} ha già un F24: segna come pagato quello, oppure eliminalo`);
    if (dto.paidOn > todayInItaly()) throw new BadRequestException('La data del pagamento non può essere nel futuro');
    await this.prisma.stampDutyPeriod.upsert(this.periodUpsert(tenantId, q, { dueAmount: dto.amount, paidOn: parseIsoDate(dto.paidOn) }));
    return this.quarter(tenantId, year, quarter);
  }

  async unmarkPaidOnPortal(tenantId: string, year: number, quarter: number): Promise<void> {
    const { count } = await this.prisma.stampDutyPeriod.updateMany({ where: { tenantId, year, quarter, paidOn: { not: null } }, data: { paidOn: null } });
    if (count === 0) throw new NotFoundException(`Il bollo del ${quarter}° trimestre ${year} non è segnato come pagato dal portale`);
  }

  private async quarter(tenantId: string, year: number, quarter: number): Promise<StampDutyQuarter> {
    const q = (await this.list(tenantId, year)).find((x) => x.quarter === quarter);
    if (!q) throw new NotFoundException(`Nessun ${quarter}° trimestre del bollo nel set di regole ${year}`);
    return q;
  }

  private periodUpsert(tenantId: string, q: StampDutyQuarter, data: { dueAmount: number; f24Id?: string; paidOn?: Date }) {
    const dates = { computedAmount: q.estimatedAmount, dueDate: parseIsoDate(q.deferredFrom ?? q.paymentDeadline), effectiveDueDate: parseIsoDate(q.paymentDeadline) };
    return {
      where: { tenantId_year_quarter: { tenantId, year: q.year, quarter: q.quarter } },
      create: { tenantId, year: q.year, quarter: q.quarter, ...dates, ...data },
      update: { ...dates, ...data },
    };
  }
}
