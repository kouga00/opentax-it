import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { type AdvanceSchedule, computeTaxes, contributionScheme, type FiscalRuleSet, roundCents, roundEuro, substituteTaxAdvance, thresholdStatus } from '@opentax-it/fiscal-rules';
import { FiscalRulesService } from '../../fiscal-rules/fiscal-rules.service.js';
import { PaymentsService } from '../../payments/services/payments.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TenantsService } from '../../tenants/tenants.service.js';
import type { UpdateTaxYearDataDto } from '../dto/request/update-tax-year-data.dto.js';

/**
 * Yearly tax summary for a tenant: collected revenue (cash basis) → income → substitute
 * tax and the contributions of the profile's scheme, balance due and advances for the following year.
 * Rules and sources in packages/fiscal-rules/src/tax-computation.ts and contribution-schemes.ts: for a
 * scheme whose contributions are not computed the INPS amounts are 0 and only the contributions paid,
 * entered by hand, count (LM35).
 *
 * Two rule sets are involved for income year N:
 * - the rules of N for the computation itself (rates, profitability coefficient, INPS rate
 *   and ceiling are yearly values of the income year: e.g. the Redditi PF 2026 instructions,
 *   booklet 2, RR section II, use the 2025 ceiling of EUR 120,607 for 2025 income);
 * - the rules of N+1 for what happens in the payment year: advances for N+1 (INPS circular
 *   8/2026 §4.2: computed with the rate of the year they refer to), deadlines and codes.
 * When one of the two sets is not active the other is used and a warning is returned.
 */
const NO_ADVANCE: AdvanceSchedule = { total: 0, first: 0, second: 0, mode: 'NOT_DUE' };

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
    const { contributionsPaid, taxAdvancesPaid, inpsAdvancesPaid, taxCredits, inpsReducedRate, inpsFixedCodes, inpsExcessCode } = dto;
    const data = { contributionsPaid, taxAdvancesPaid, inpsAdvancesPaid, taxCredits, inpsReducedRate, inpsFixedCodes, inpsExcessCode };
    return this.prisma.taxYearData.upsert({ where: { tenantId_year: { tenantId, year } }, update: data, create: { tenantId, year, ...data } });
  }

  /**
   * The active set of a year, or why it cannot be used: none active (404), or an active set stored with an older
   * schema (422), which an admin replaces by loading and activating the newer bundled version.
   */
  private async activeOrReason(year: number): Promise<{ rules: FiscalRuleSet; reason?: undefined } | { rules: null; reason: string }> {
    try {
      return { rules: await this.rules.getActive(year) };
    } catch (e) {
      if (e instanceof NotFoundException) return { rules: null, reason: `Nessun set di regole attivo per il ${year}` };
      if (e instanceof UnprocessableEntityException) return { rules: null, reason: `Il set di regole attivo per il ${year} è di una versione precedente dell'applicazione: in Regole fiscali un amministratore carica e attiva quello nuovo` };
      throw e;
    }
  }

  /** Rule sets for income year N (computation) and payment year N+1 (advances, deadlines). */
  async rulesForTaxYear(year: number) {
    const [incomeSet, paymentSet] = await Promise.all([this.activeOrReason(year), this.activeOrReason(year + 1)]);
    const income = incomeSet.rules;
    const payment = paymentSet.rules;
    const warnings: string[] = [];
    if (!income && !payment) throw new NotFoundException(`${incomeSet.reason}; ${paymentSet.reason}`);
    if (!income) warnings.push(`${incomeSet.reason}: aliquote, coefficiente e massimale INPS presi dal ${year + 1}`);
    // The rules of a year arrive once its INPS circular and instructions are out (early in that year).
    if (!payment) warnings.push(`${paymentSet.reason}: acconti, scadenze e codici tributo presi dal ${year}${year + 1 > new Date().getFullYear() ? ` (è normale finché la normativa ${year + 1} non è pubblicata e inclusa in un aggiornamento dell'applicazione)` : ''}`);
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
   *   INPS balance/advance lines of forms paid in `year`, interest excluded, and the deductible part of the
   *   contribution rows entered by the taxpayer (role CONTRIBUTION: Artigiani, Commercianti, professional funds).
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
        where: {
          f24: { tenantId, status: 'PAID', paidOn: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
          OR: [{ section: 'INPS', role: { in: ['BALANCE', 'FIRST_ADVANCE', 'SECOND_ADVANCE'] } }, { role: 'CONTRIBUTION' }],
        },
        select: { role: true, debitAmount: true, surchargeAmount: true, deductibleAmount: true },
      }),
    ]);
    const sum = (rows: Array<{ debitAmount: unknown; surchargeAmount: unknown }>) => roundCents(rows.reduce((t, r) => t + Number(r.debitAmount) - Number(r.surchargeAmount), 0));
    return {
      taxAdvancesPaid: sum(advances.filter((a) => a.section === 'TREASURY')),
      inpsAdvancesPaid: sum(advances.filter((a) => a.section === 'INPS')),
      contributionsPaid: roundCents(sum(contributions.filter((c) => c.role !== 'CONTRIBUTION')) + contributions.filter((c) => c.role === 'CONTRIBUTION').reduce((t, c) => t + Number(c.deductibleAmount), 0)),
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
    const scheme = contributionScheme(profile.socialSecurityScheme, rules);
    // The following year's rules give the advances: an older active set may lack the scheme's section.
    const nextScheme = contributionScheme(profile.socialSecurityScheme, paymentRules);
    const selfEmployedOptions = { flatRateReduction: profile.inpsFlatRateReduction, seniorityBefore1996: profile.inpsSeniorityBefore1996 };
    const contributionOptions = { ratePct: inpsRatePct, nextYearRatePct: inpsRatePct, ...selfEmployedOptions };
    for (const [set, setYear] of [[scheme, incomeRulesYear], [nextScheme, paymentRulesYear]] as const) {
      if (!set && contributionScheme(profile.socialSecurityScheme)) {
        warnings.push(`Il set di regole attivo del ${setYear} non ha i dati di questa gestione previdenziale: attiva la versione più recente in Regole fiscali`);
      }
    }
    const result = computeTaxes(rules, {
      contributionOptions: selfEmployedOptions,
      contributionScheme: profile.socialSecurityScheme,
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
    const inpsBalance = scheme ? roundCents(result.inpsContribution - inpsAdvancesPaid) : 0; // RR7 / RR8
    return {
      year,
      rulesYear: incomeRulesYear,
      paymentRulesYear,
      warnings,
      collectedRevenue,
      thresholds: thresholdStatus(rules, collectedRevenue),
      contributions: {
        scheme: profile.socialSecurityScheme,
        computed: result.contributionsComputed,
        /** Artigiani and Commercianti: contribution on the minimum income of the year, in four installments. */
        fixed: scheme?.fixed?.(rules, contributionOptions) ?? null,
        flatRateReduction: profile.inpsFlatRateReduction,
      },
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
        /** Artigiani and Commercianti: INPS codes of the year (four fixed installments, contribution above the minimum). */
        inpsFixedCodes: data.inpsFixedCodes,
        inpsExcessCode: data.inpsExcessCode,
      },
      result,
      taxBalance,
      inpsBalance,
      nextYearAdvances: {
        tax: substituteTaxAdvance(paymentRules, result.taxNetOfCredits, profile.isaSubject),
        inps: scheme && nextScheme ? nextScheme.advance(paymentRules, result.grossIncome, result, { ...contributionOptions, nextYearRatePct: nextYearInpsRatePct }) : NO_ADVANCE,
      },
    };
  }
}
