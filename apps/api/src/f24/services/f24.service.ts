import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { buildCompensation, buildPaymentSchedule, creditsAboveLimit, type F24Draft, findInpsOfficeById, type FiscalRuleSet, horizontalUses, i24CancelBy, maxInstallmentDates, nextBusinessDay, parseIsoDate, type PaymentScheduleAmounts, toIsoDate } from '@opentax-it/fiscal-rules';
import type { F24Kind } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TaxCreditsService } from '../../tax-credits/services/tax-credits.service.js';
import { TaxesService } from '../../taxes/services/taxes.service.js';
import { TenantsService } from '../../tenants/tenants.service.js';
import { F24PdfService } from './f24-pdf.service.js';
import type { PlanParametersDto } from '../dto/request/plan-parameters.dto.js';
import type { UpdateF24StatusDto } from '../dto/request/update-f24-status.dto.js';
import type { PlanStart } from '../types/plan-start.js';
import type { PlanOptions } from '../types/plan-options.js';
import type { PlanPreview, PlannedForm } from '../types/plan-preview.js';
import type { PlanStartOption } from '../types/plan-start-option.js';
import type { SavedF24 } from '../types/saved-f24.js';
import type { SavedPlan } from '../types/saved-plan.js';

/**
 * Installment plans and F24 forms for the balance/advances of a tax year. The forms are
 * computed by packages/fiscal-rules (f24-schedule.ts, with sources) from the tax summary
 * of the year and the tenant profile (INPS office code); this service persists them and
 * tracks their status (planned → I24 scheduled → paid).
 *
 * Deadlines that fall on a Saturday or holiday are paid on the next business day
 * (DL 70/2011 art. 7); the installment interest is computed on the nominal dates
 * (Redditi PF 2026 instructions, "Rateazione").
 */
@Injectable()
export class F24Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taxes: TaxesService,
    private readonly tenants: TenantsService,
    private readonly pdf24: F24PdfService,
    private readonly credits: TaxCreditsService,
  ) {}

  /** The four possible first due dates (ordinary, yearly extension, 30-day deferrals) offered by the payment year's rule set. */
  startOptions(rules: FiscalRuleSet): PlanStartOption[] {
    const d = rules.deadlines;
    const opt = (start: PlanStart, date: string | undefined, surchargePct: number | undefined, refKey: string): PlanStartOption | null =>
      date
        ? { start, date, surchargePct: surchargePct ?? 0, maxInstallments: maxInstallmentDates(parseIsoDate(date), d.installmentDay, d.installmentsEnd).length, source: rules.sourceRefs[refKey]?.title }
        : null;
    return [
      opt('ORDINARY', d.balanceAndFirstAdvance, 0, 'deadlines.balanceAndFirstAdvance'),
      opt('EXTENDED', d.balanceAndFirstAdvanceExtended, 0, 'deadlines.balanceAndFirstAdvanceExtended'),
      opt('DEFERRED', d.deferred, d.deferralSurchargePct, 'deadlines.deferred'),
      opt('DEFERRED_EXTENDED', d.deferredExtended, d.deferralSurchargeExtendedPct, 'deadlines.balanceAndFirstAdvanceExtended'),
    ].filter((o): o is PlanStartOption => o !== null);
  }

  async planOptions(tenantId: string, taxYear: number): Promise<PlanOptions> {
    const { paymentRules, paymentRulesYear, warnings } = await this.taxes.rulesForTaxYear(taxYear);
    await this.tenants.getWithProfile(tenantId);
    return { taxYear, paymentYear: taxYear + 1, rulesYear: paymentRulesYear, warnings, starts: this.startOptions(paymentRules), secondAdvanceDate: paymentRules.deadlines.secondAdvance };
  }

  private async compute(tenantId: string, taxYear: number, dto: PlanParametersDto): Promise<PlanPreview> {
    const { profile } = await this.tenants.getWithProfile(tenantId);
    const office = profile.inpsOfficeId ? findInpsOfficeById(profile.inpsOfficeId) : undefined;
    if (!office) throw new BadRequestException('Set the INPS office (codice sede) in the profile before generating F24 forms');
    const [summary, { paymentRules, paymentRulesYear, warnings }] = await Promise.all([this.taxes.summary(tenantId, taxYear), this.taxes.rulesForTaxYear(taxYear)]);
    // Above 100,000 the regime ends in the same year and income is determined in the ordinary way for the
    // whole year (L. 190/2014 par. 71; Redditi PF 2026 booklet 3): the flat-rate amounts do not apply.
    if (summary.thresholds.exceedsExitThreshold) {
      throw new UnprocessableEntityException(`Incassato ${taxYear} oltre ${summary.thresholds.exitThreshold} €: il regime forfettario è cessato nell'anno e il reddito va determinato in modo ordinario, quindi il piano F24 forfettario non si genera (L. 190/2014 c. 71).`);
    }
    const start = this.startOptions(paymentRules).find((o) => o.start === dto.start);
    if (!start) throw new BadRequestException(`Start "${dto.start}" is not available for ${paymentRulesYear}`);
    if (dto.installments > start.maxInstallments) throw new BadRequestException(`At most ${start.maxInstallments} installments from ${start.date} (plan must end by 16 December)`);

    const due: PaymentScheduleAmounts = {
      taxBalance: Math.max(0, summary.taxBalance),
      taxFirstAdvance: summary.nextYearAdvances.tax.first,
      taxSecondAdvance: summary.nextYearAdvances.tax.second,
      inpsBalance: Math.max(0, summary.inpsBalance),
      inpsFirstAdvance: summary.nextYearAdvances.inps.first,
      inpsSecondAdvance: summary.nextYearAdvances.inps.second,
    };
    const inpsReducedRate = summary.input.inpsRatePct === paymentRules.inps.reducedRatePct;
    const availableCredits = dto.useCredits ? await this.credits.available(tenantId, parseIsoDate(start.date)) : [];
    // Credits cover the debts first, without the deferral surcharge; only the residual goes to the
    // installment plan with the surcharge. AdE: "Per coloro che effettuano la compensazione, la
    // maggiorazione si applica solamente sulla differenza tra debiti e crediti, se positiva" (Redditi 2026
    // general instructions, companies, §4.2); same rule for individuals in the Unico PF 2007 instructions
    // (booklet 1, §6: with debts and credits of equal amount the taxpayer "non è tenuto a corrispondere tale
    // maggiorazione"; otherwise it "si applica alla differenza").
    const compensation = buildCompensation(paymentRules, {
      taxYear,
      amounts: due,
      inpsOfficeCode: office.code,
      inpsReducedRate,
      date: parseIsoDate(start.date),
      credits: availableCredits,
      order: dto.creditOrder ?? 'INPS_FIRST',
    });
    const amounts = compensation.amounts;
    const schedule = buildPaymentSchedule(paymentRules, {
      taxYear,
      amounts,
      inpsOfficeCode: office.code,
      inpsReducedRate,
      firstDueDate: parseIsoDate(start.date),
      surchargePct: start.surchargePct,
      installments: dto.installments,
      secondAdvanceDate: parseIsoDate(paymentRules.deadlines.secondAdvance),
    });
    const creditsUsed = round2(compensation.usages.reduce((s, u) => s + u.amount, 0));
    const compensationWarnings: string[] = [];
    if (compensation.form) {
      compensationWarnings.push('Modello con compensazione: va presentato solo con i servizi telematici dell\'Agenzia delle Entrate (F24 web/online), anche a saldo zero (Istr. Redditi PF §8; art. 37 c. 49-bis DL 223/2006)');
      // 5,000 limit per credit and reference year, horizontal use only, earlier forms included (res. 110/E/2019).
      const byId = new Map(availableCredits.map((c) => [c.id, c]));
      const current = horizontalUses(
        compensation.usages.flatMap((u) => {
          const c = byId.get(u.creditId);
          return c ? [{ creditId: c.id, section: c.section, code: c.code, referenceYear: c.referenceYear, amount: u.amount }] : [];
        }),
        compensation.form.lines.filter((l) => l.role !== 'CREDIT').map((l) => ({ code: l.code, amount: l.debitAmount })),
      );
      for (const over of creditsAboveLimit(current, await this.credits.earlierUses(tenantId))) {
        compensationWarnings.push(`Credito ${over.code} ${over.referenceYear} usato in compensazione per ${over.total.toFixed(2).replace('.', ',')} € nell'anno, oltre 5.000 €: utilizzabile solo dal decimo giorno successivo alla presentazione della dichiarazione e con il visto di conformità (art. 3 D.Lgs. 33/2025; L. 147/2013 art. 1 c. 574; ris. AdE 110/E/2019). Indica la data in "utilizzabile dal" del credito.`);
      }
    }
    return {
      taxYear,
      paymentYear: taxYear + 1,
      rulesYear: paymentRulesYear,
      ruleSetVersion: await this.activeVersion(paymentRulesYear),
      start: start.start,
      firstDueDate: start.date,
      surchargePct: start.surchargePct,
      installments: dto.installments,
      maxInstallments: start.maxInstallments,
      /** Amounts due from the return, before credits. */
      due,
      /** Amounts split into the forms, after credits. */
      amounts,
      credits: { tax: Math.max(0, -summary.taxBalance), inps: Math.max(0, -summary.inpsBalance) },
      compensation: { used: creditsUsed, unused: compensation.unusedCredit, order: dto.creditOrder ?? 'INPS_FIRST', usages: compensation.usages },
      inpsOfficeCode: office.code,
      forms: [...(compensation.form ? [compensation.form] : []), ...schedule.forms].map(serializeForm),
      warnings: [...warnings, ...compensationWarnings, ...schedule.warnings],
    };
  }

  private async activeVersion(year: number) {
    const rs = await this.prisma.fiscalRuleSet.findFirst({ where: { year, status: 'ACTIVE' }, select: { version: true } });
    return rs?.version ?? null;
  }

  async preview(tenantId: string, taxYear: number, dto: PlanParametersDto): Promise<PlanPreview> {
    return this.compute(tenantId, taxYear, dto);
  }

  async createPlan(tenantId: string, taxYear: number, dto: PlanParametersDto): Promise<SavedPlan> {
    const existing = await this.prisma.installmentPlan.findUnique({ where: { tenantId_taxYear: { tenantId, taxYear } } });
    if (existing) throw new ConflictException(`A plan for ${taxYear} already exists: delete it to generate a new one`);
    const p = await this.compute(tenantId, taxYear, dto);
    if (p.rulesYear !== taxYear + 1) throw new ConflictException(`The rule set for ${taxYear + 1} is not active: the plan cannot be saved with the dates of ${p.rulesYear}`);
    if (p.forms.length === 0) throw new BadRequestException('Nothing to pay: no balance or advance due');
    await this.prisma.installmentPlan.create({
      data: {
        tenantId,
        taxYear,
        paymentYear: p.paymentYear,
        firstDueDate: parseIsoDate(p.firstDueDate),
        installments: p.installments,
        surchargePct: p.surchargePct,
        taxBalance: p.amounts.taxBalance,
        taxFirstAdvance: p.amounts.taxFirstAdvance,
        taxSecondAdvance: p.amounts.taxSecondAdvance,
        inpsBalance: p.amounts.inpsBalance,
        inpsFirstAdvance: p.amounts.inpsFirstAdvance,
        inpsSecondAdvance: p.amounts.inpsSecondAdvance,
        ruleSetVersion: p.ruleSetVersion,
        creditsUsed: creditsUsedTotal(p),
        f24s: {
          create: p.forms.map((f) => ({
            tenantId,
            kind: f.kind as F24Kind,
            paymentDate: parseIsoDate(f.paymentDate),
            installmentNumber: f.installmentNumber ?? null,
            installmentsTotal: f.installmentsTotal ?? null,
            totalDebit: f.totalDebit,
            totalCredit: f.totalCredit,
            balance: round2(f.totalDebit - f.totalCredit),
            i24CancelBy: parseIsoDate(f.i24CancelBy),
            lines: {
              create: f.lines.map((l, i) => ({
                section: l.section,
                role: l.role,
                code: l.code,
                officeCode: l.officeCode ?? null,
                installmentCode: l.installmentCode ?? null,
                localCode: l.localCode ?? null,
                periodFrom: l.periodFrom ?? null,
                periodTo: l.periodTo ?? null,
                referenceYear: l.referenceYear,
                debitAmount: l.debitAmount,
                surchargeAmount: l.surchargeAmount ?? 0,
                creditAmount: l.creditAmount ?? 0,
                description: l.description,
                // Credit rows are matched to the credits in the same order they were consumed.
                ...(l.role === 'CREDIT' ? { creditUsage: { create: { taxCreditId: p.compensation.usages[creditRowIndex(f.lines, i)].creditId, amount: l.creditAmount ?? 0 } } } : {}),
              })),
            },
          })),
        },
      },
    });
    return this.getPlan(tenantId, taxYear);
  }

  async getPlan(tenantId: string, taxYear: number): Promise<SavedPlan> {
    const plan = await this.prisma.installmentPlan.findUnique({
      where: { tenantId_taxYear: { tenantId, taxYear } },
      include: { f24s: { include: { lines: true }, orderBy: { paymentDate: 'asc' } } },
    });
    if (!plan) throw new NotFoundException(`No plan for ${taxYear}`);
    return plan;
  }

  async listByPaymentYear(tenantId: string, year: number): Promise<SavedF24[]> {
    return this.prisma.f24.findMany({
      where: { tenantId, paymentDate: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
      include: { lines: true, plan: { select: { taxYear: true, installments: true } } },
      orderBy: [{ paymentDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async deletePlan(tenantId: string, taxYear: number) {
    const plan = await this.getPlan(tenantId, taxYear);
    const locked = plan.f24s.filter((f) => f.status === 'PAID' || f.status === 'SCHEDULED_I24');
    if (locked.length > 0) throw new ConflictException(`${locked.length} form(s) are paid or scheduled: set them back to planned before deleting the plan`);
    await this.prisma.installmentPlan.delete({ where: { id: plan.id } });
  }

  async get(tenantId: string, id: string): Promise<SavedF24> {
    const f24 = await this.prisma.f24.findFirst({ where: { id, tenantId }, include: { lines: true, plan: { select: { taxYear: true, installments: true } } } });
    if (!f24) throw new NotFoundException('F24 not found');
    return f24;
  }

  async pdf(tenantId: string, id: string) {
    const [f24, { profile }] = await Promise.all([this.get(tenantId, id), this.tenants.getWithProfile(tenantId)]);
    const content = await this.pdf24.render({
      paymentDate: toIsoDate(f24.paymentDate),
      fiscalCode: profile.fiscalCode,
      name: profile.businessName ?? profile.lastName,
      firstName: profile.businessName ? null : profile.firstName,
      birthDate: profile.birthDate ? toIsoDate(profile.birthDate) : null,
      sex: profile.sex,
      birthPlace: profile.birthPlace,
      birthProvince: profile.birthProvince,
      city: profile.city,
      province: profile.province,
      address: profile.address,
      lines: f24.lines.map((l) => ({
        section: l.section,
        code: l.code,
        officeCode: l.officeCode,
        installmentCode: l.installmentCode,
        localCode: l.localCode,
        periodFrom: l.periodFrom,
        periodTo: l.periodTo,
        referenceYear: l.referenceYear,
        debitAmount: Number(l.debitAmount),
        creditAmount: Number(l.creditAmount),
      })),
    });
    const date = toIsoDate(f24.paymentDate);
    const label = f24.installmentNumber ? `rata-${f24.installmentNumber}-di-${f24.installmentsTotal}` : f24.kind.toLowerCase().replace(/_/g, '-');
    return { fileName: `F24_${date}_${label}.pdf`, content };
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateF24StatusDto): Promise<SavedF24> {
    const f24 = await this.prisma.f24.findFirst({ where: { id, tenantId } });
    if (!f24) throw new NotFoundException('F24 not found');
    const { status } = dto;
    const data =
      status === 'PAID'
        ? { status, paidOn: dto.paidOn ? parseIsoDate(dto.paidOn) : new Date(), i24ScheduledAt: f24.i24ScheduledAt }
        : status === 'SCHEDULED_I24'
          ? { status, paidOn: null, i24ScheduledAt: new Date() }
          : { status, paidOn: null, i24ScheduledAt: null };
    await this.prisma.f24.update({ where: { id }, data });
    return this.get(tenantId, id);
  }
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Position of a credit row among the credit rows of the form (= index of its usage). */
function creditRowIndex(lines: F24Draft['lines'], index: number): number {
  return lines.slice(0, index).filter((l) => l.role === 'CREDIT').length;
}

function creditsUsedTotal(p: { compensation: { used: number } }): number {
  return p.compensation.used;
}

/** Payment date moved to the next business day; the I24 cancellation limit follows the actual debit date. */
function serializeForm(f: F24Draft): PlannedForm {
  const paymentDate = nextBusinessDay(f.paymentDate);
  return {
    ...f,
    nominalPaymentDate: toIsoDate(f.paymentDate),
    paymentDate: toIsoDate(paymentDate),
    i24CancelBy: toIsoDate(i24CancelBy(paymentDate)),
  };
}
