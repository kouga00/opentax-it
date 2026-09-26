import type { F24LineDraft } from '@opentax-it/fiscal-rules';
import type { F24Line } from '../../generated/prisma/client.js';
import { CompensationUsageDto } from '../dto/response/compensation-usage.dto.js';
import { CompensationDto } from '../dto/response/compensation.dto.js';
import { F24LineDto } from '../dto/response/f24-line.dto.js';
import { F24PlanRefDto } from '../dto/response/f24-plan-ref.dto.js';
import { F24Dto } from '../dto/response/f24.dto.js';
import { InstallmentPlanDto } from '../dto/response/installment-plan.dto.js';
import { PlanAmountsDto } from '../dto/response/plan-amounts.dto.js';
import { PlanCreditsDto } from '../dto/response/plan-credits.dto.js';
import { PlanOptionsDto } from '../dto/response/plan-options.dto.js';
import { PlanPreviewDto } from '../dto/response/plan-preview.dto.js';
import { PlanStartOptionDto } from '../dto/response/plan-start-option.dto.js';
import { PlannedFormDto } from '../dto/response/planned-form.dto.js';
import type { PlanOptions } from '../types/plan-options.js';
import type { PlanPreview } from '../types/plan-preview.js';
import type { SavedF24 } from '../types/saved-f24.js';
import type { SavedPlan } from '../types/saved-plan.js';

/**
 * Builds the F24 and installment plan responses field by field: Decimals become numbers, date-only columns
 * YYYY-MM-DD, tenant and plan ids stay out.
 */

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function toLineDto(l: F24Line | F24LineDraft): F24LineDto {
  return Object.assign(new F24LineDto(), {
    id: 'id' in l ? l.id : undefined,
    section: l.section,
    role: l.role,
    code: l.code,
    officeCode: l.officeCode ?? null,
    installmentCode: l.installmentCode ?? null,
    localCode: l.localCode ?? null,
    periodFrom: l.periodFrom ?? null,
    periodTo: l.periodTo ?? null,
    referenceYear: l.referenceYear,
    debitAmount: Number(l.debitAmount),
    surchargeAmount: Number(l.surchargeAmount ?? 0),
    creditAmount: Number(l.creditAmount ?? 0),
    description: l.description ?? null,
  });
}

export function toF24Dto(f: Omit<SavedF24, 'plan'>, plan: { taxYear: number; installments: number } | null): F24Dto {
  return Object.assign(new F24Dto(), {
    id: f.id,
    kind: f.kind,
    status: f.status,
    paymentDate: isoDate(f.paymentDate),
    installmentNumber: f.installmentNumber,
    installmentsTotal: f.installmentsTotal,
    totalDebit: Number(f.totalDebit),
    totalCredit: Number(f.totalCredit),
    balance: Number(f.balance),
    i24CancelBy: f.i24CancelBy ? isoDate(f.i24CancelBy) : null,
    paidOn: f.paidOn ? isoDate(f.paidOn) : null,
    i24ScheduledAt: f.i24ScheduledAt ? f.i24ScheduledAt.toISOString() : null,
    plan: plan ? Object.assign(new F24PlanRefDto(), { taxYear: plan.taxYear, installments: plan.installments }) : null,
    lines: f.lines.map(toLineDto),
  });
}

export const toSavedF24Dto = (f: SavedF24): F24Dto => toF24Dto(f, f.plan);

export function toInstallmentPlanDto(p: SavedPlan): InstallmentPlanDto {
  return Object.assign(new InstallmentPlanDto(), {
    id: p.id,
    taxYear: p.taxYear,
    paymentYear: p.paymentYear,
    firstDueDate: isoDate(p.firstDueDate),
    installments: p.installments,
    surchargePct: Number(p.surchargePct),
    taxBalance: Number(p.taxBalance),
    taxFirstAdvance: Number(p.taxFirstAdvance),
    taxSecondAdvance: Number(p.taxSecondAdvance),
    inpsBalance: Number(p.inpsBalance),
    inpsFirstAdvance: Number(p.inpsFirstAdvance),
    inpsSecondAdvance: Number(p.inpsSecondAdvance),
    creditsUsed: Number(p.creditsUsed),
    ruleSetVersion: p.ruleSetVersion,
    createdAt: p.createdAt.toISOString(),
    f24s: p.f24s.map((f) => toF24Dto(f, { taxYear: p.taxYear, installments: p.installments })),
  });
}

export function toPlanOptionsDto(o: PlanOptions): PlanOptionsDto {
  return Object.assign(new PlanOptionsDto(), {
    taxYear: o.taxYear,
    paymentYear: o.paymentYear,
    rulesYear: o.rulesYear,
    warnings: o.warnings,
    starts: o.starts.map((s) => Object.assign(new PlanStartOptionDto(), { start: s.start, date: s.date, surchargePct: s.surchargePct, maxInstallments: s.maxInstallments, source: s.source })),
    secondAdvanceDate: o.secondAdvanceDate,
  });
}

const toAmountsDto = (a: PlanPreview['due']): PlanAmountsDto =>
  Object.assign(new PlanAmountsDto(), {
    taxBalance: a.taxBalance,
    taxFirstAdvance: a.taxFirstAdvance,
    taxSecondAdvance: a.taxSecondAdvance,
    inpsBalance: a.inpsBalance,
    inpsFirstAdvance: a.inpsFirstAdvance,
    inpsSecondAdvance: a.inpsSecondAdvance,
  });

export function toPlanPreviewDto(p: PlanPreview): PlanPreviewDto {
  return Object.assign(new PlanPreviewDto(), {
    taxYear: p.taxYear,
    paymentYear: p.paymentYear,
    rulesYear: p.rulesYear,
    ruleSetVersion: p.ruleSetVersion,
    start: p.start,
    firstDueDate: p.firstDueDate,
    surchargePct: p.surchargePct,
    installments: p.installments,
    maxInstallments: p.maxInstallments,
    due: toAmountsDto(p.due),
    amounts: toAmountsDto(p.amounts),
    credits: Object.assign(new PlanCreditsDto(), { tax: p.credits.tax, inps: p.credits.inps }),
    compensation: Object.assign(new CompensationDto(), {
      used: p.compensation.used,
      unused: p.compensation.unused,
      order: p.compensation.order,
      usages: p.compensation.usages.map((u) => Object.assign(new CompensationUsageDto(), { creditId: u.creditId, amount: u.amount })),
    }),
    inpsOfficeCode: p.inpsOfficeCode,
    forms: p.forms.map((f) =>
      Object.assign(new PlannedFormDto(), {
        kind: f.kind,
        paymentDate: f.paymentDate,
        nominalPaymentDate: f.nominalPaymentDate,
        installmentNumber: f.installmentNumber ?? null,
        installmentsTotal: f.installmentsTotal ?? null,
        totalDebit: f.totalDebit,
        totalCredit: f.totalCredit,
        i24CancelBy: f.i24CancelBy,
        lines: f.lines.map(toLineDto),
      }),
    ),
    warnings: p.warnings,
  });
}
