import { Injectable, NotFoundException } from '@nestjs/common';
import { computeTaxes, inpsAdvance, roundEuro, substituteTaxAdvance, thresholdStatus } from '@opentax-it/fiscal-rules';

const roundCents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
import { FiscalRulesService } from '../../fiscal-rules/fiscal-rules.service.js';
import { PaymentsService } from '../../payments/services/payments.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TenantsService } from '../../tenants/tenants.service.js';
import type { UpdateTaxYearDataDto } from '../dto/request/update-tax-year-data.dto.js';

/**
 * Yearly tax summary for a tenant: collected revenue (cash basis) → income → substitute
 * tax and INPS, balance due and advances for the following year. Rules and sources in
 * packages/fiscal-rules/src/tax-computation.ts.
 *
 * Two rule sets are involved for income year N:
 * - the rules of N for the computation itself (rates, profitability coefficient, INPS rate
 *   and ceiling are yearly values of the income year: e.g. the Redditi PF 2026 instructions,
 *   booklet 2, RR section II, use the 2025 ceiling of EUR 120,607 for 2025 income);
 * - the rules of N+1 for what happens in the payment year: advances for N+1 (INPS circular
 *   8/2026 §4.2: computed with the rate of the year they refer to), deadlines and codes.
 * When one of the two sets is not active the other is used and a warning is returned.
 */
@Injectable()
export class TaxesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rules: FiscalRulesService,
    private readonly payments: PaymentsService,
    private readonly tenants: TenantsService,
  ) {}

  async yearData(tenantId: string, year: number) {
    return this.prisma.taxYearData.upsert({ where: { tenantId_year: { tenantId, year } }, update: {}, create: { tenantId, year } });
  }

  async updateYearData(tenantId: string, year: number, dto: UpdateTaxYearDataDto) {
    const { contributionsPaid, taxAdvancesPaid, inpsAdvancesPaid, taxCredits, inpsReducedRate } = dto;
    const data = { contributionsPaid, taxAdvancesPaid, inpsAdvancesPaid, taxCredits, inpsReducedRate };
    return this.prisma.taxYearData.upsert({ where: { tenantId_year: { tenantId, year } }, update: data, create: { tenantId, year, ...data } });
  }

  private async activeOrNull(year: number) {
    try {
      return await this.rules.getActive(year);
    } catch {
      return null;
    }
  }

  /** Rule sets for income year N (computation) and payment year N+1 (advances, deadlines). */
  async rulesForTaxYear(year: number) {
    const [income, payment] = await Promise.all([this.activeOrNull(year), this.activeOrNull(year + 1)]);
    const warnings: string[] = [];
    if (!income && !payment) throw new NotFoundException(`No active rule set for ${year} or ${year + 1}`);
    if (!income) warnings.push(`Nessun set di regole attivo per il ${year}: aliquote, coefficiente e massimale INPS presi dal ${year + 1}`);
    if (!payment) warnings.push(`Nessun set di regole attivo per il ${year + 1}: acconti, scadenze e codici tributo presi dal ${year}`);
    return {
      incomeRules: (income ?? payment)!,
      incomeRulesYear: income ? year : year + 1,
      paymentRules: (payment ?? income)!,
      paymentRulesYear: payment ? year + 1 : year,
      warnings,
    };
  }

  /**
   * Amounts already paid with F24 forms recorded here (status PAID), from the role of each line:
   * - advances for `year`: FIRST/SECOND_ADVANCE lines with reference year = `year` (LM45; RR5 col. 16);
   * - contributions paid in `year` (cash basis, LM35 col. 1: "versati nel presente periodo d'imposta"):
   *   INPS balance/advance lines of forms paid in `year`, interest excluded.
   * Deferral surcharges are excluded (booklet 3, LM45: "non devono essere considerate le maggiorazioni"):
   * Treasury rows store their surcharge share; INPS pays it with DPPI (interest rows, already excluded).
   * Amounts entered by hand in TaxYearData are added to these (payments made outside the tool).
   */
  async paidFromF24(tenantId: string, year: number) {
    const [advances, contributions] = await Promise.all([
      this.prisma.f24Line.findMany({
        where: { f24: { tenantId, status: 'PAID' }, role: { in: ['FIRST_ADVANCE', 'SECOND_ADVANCE'] }, referenceYear: year },
        select: { section: true, debitAmount: true, surchargeAmount: true },
      }),
      this.prisma.f24Line.findMany({
        where: { f24: { tenantId, status: 'PAID', paidOn: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } }, section: 'INPS', role: { in: ['BALANCE', 'FIRST_ADVANCE', 'SECOND_ADVANCE'] } },
        select: { debitAmount: true, surchargeAmount: true },
      }),
    ]);
    const sum = (rows: Array<{ debitAmount: unknown; surchargeAmount: unknown }>) => roundCents(rows.reduce((t, r) => t + Number(r.debitAmount) - Number(r.surchargeAmount), 0));
    return {
      taxAdvancesPaid: sum(advances.filter((a) => a.section === 'TREASURY')),
      inpsAdvancesPaid: sum(advances.filter((a) => a.section === 'INPS')),
      contributionsPaid: sum(contributions),
    };
  }

  async summary(tenantId: string, year: number) {
    const { profile } = await this.tenants.getWithProfile(tenantId);
    const [data, collectedRevenue, { incomeRules: rules, incomeRulesYear, paymentRules, paymentRulesYear, warnings }, fromF24] = await Promise.all([
      this.yearData(tenantId, year),
      this.payments.collectedRevenue(tenantId, year),
      this.rulesForTaxYear(year),
      this.paidFromF24(tenantId, year),
    ]);
    const contributionsPaid = roundCents(Number(data.contributionsPaid) + fromF24.contributionsPaid);
    const taxAdvancesPaid = roundCents(Number(data.taxAdvancesPaid) + fromF24.taxAdvancesPaid);
    const inpsAdvancesPaid = roundCents(Number(data.inpsAdvancesPaid) + fromF24.inpsAdvancesPaid);
    const inpsRatePct = data.inpsReducedRate ? rules.inps.reducedRatePct : rules.inps.fullRatePct;
    const nextYearInpsRatePct = data.inpsReducedRate ? paymentRules.inps.reducedRatePct : paymentRules.inps.fullRatePct;
    const result = computeTaxes(rules, {
      year,
      collectedRevenue,
      atecoCode: profile.atecoCode,
      activityStartYear: profile.activityStartYear,
      reducedRateEligible: profile.reducedRate,
      contributionsPaid,
      inpsRatePct,
      taxCredits: Number(data.taxCredits),
    });
    // Return rows are whole euro (Redditi PF instructions, "Modalità di arrotondamento").
    const taxBalance = roundEuro(result.taxNetOfCredits - roundEuro(taxAdvancesPaid)); // LM46 (>0) / LM47 (<0)
    const inpsBalance = roundCents(result.inpsContribution - inpsAdvancesPaid); // RR7 / RR8
    return {
      year,
      rulesYear: incomeRulesYear,
      paymentRulesYear,
      warnings,
      collectedRevenue,
      thresholds: thresholdStatus(rules, collectedRevenue),
      input: {
        atecoCode: profile.atecoCode,
        activityStartYear: profile.activityStartYear,
        reducedRateEligible: profile.reducedRate,
        isaSubject: profile.isaSubject,
        contributionsPaid,
        taxAdvancesPaid,
        inpsAdvancesPaid,
        taxCredits: Number(data.taxCredits),
        manual: { contributionsPaid: Number(data.contributionsPaid), taxAdvancesPaid: Number(data.taxAdvancesPaid), inpsAdvancesPaid: Number(data.inpsAdvancesPaid) },
        fromF24,
        inpsRatePct,
        nextYearInpsRatePct,
      },
      result,
      taxBalance,
      inpsBalance,
      nextYearAdvances: {
        tax: substituteTaxAdvance(paymentRules, result.taxNetOfCredits, profile.isaSubject),
        inps: inpsAdvance(paymentRules, result.inpsTaxableIncome, nextYearInpsRatePct),
      },
    };
  }
}
