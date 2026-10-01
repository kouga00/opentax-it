import { Injectable } from '@nestjs/common';
import { type FiscalRuleSet, lmReturnRows, reducedRateApplies, type ReturnRow, roundCents, selfEmployedReasons, selfEmployedReturnRows, separateSchemeReturnRows, substituteTaxResultRows } from '@opentax-it/fiscal-rules';
import { isIssued } from '../../common/invoice-issue.js';
import { REVENUE_INVOICE_SELECT, revenueShare } from '../../common/revenue.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TenantsService } from '../../tenants/tenants.service.js';
import type { ReturnGuide } from '../types/return-guide.js';
import type { RevenueDifference } from '../types/revenue-difference.js';
import { TaxesService } from './taxes.service.js';

const yearRange = (year: number) => ({ gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) });
const customerName = (c: { businessName: string | null; firstName: string | null; lastName: string | null }) => c.businessName ?? [c.firstName, c.lastName].filter(Boolean).join(' ');

/**
 * Guide to the LM form of the pre-filled Redditi PF: the rows computed by the app (packages/fiscal-rules,
 * tax-return-lm.ts) and the invoices that explain why the proposed revenue differs from the collected one. The
 * pre-filled return assumes "che il pagamento sia stato effettuato alla data di emissione della fattura" and asks to
 * include "le fatture emesse nello scorso anno ed incassate nell'anno d'imposta" and exclude "quelli delle fatture
 * emesse nell'anno d'imposta che non risultano incassate al 31 dicembre" (AdE guide to the pre-filled Redditi PF 2026).
 */
@Injectable()
export class ReturnGuideService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taxes: TaxesService,
    private readonly tenants: TenantsService,
  ) {}

  async guide(tenantId: string, year: number): Promise<ReturnGuide> {
    const [summary, { incomeRules }, { profile }] = await Promise.all([this.taxes.summary(tenantId, year), this.taxes.rulesForTaxYear(year), this.tenants.getWithProfile(tenantId)]);
    const [invoicesOfYear, paymentsOfYear] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { tenantId, date: yearRange(year) },
        select: { id: true, number: true, date: true, type: true, status: true, imported: true, exchangeRate: true, ...REVENUE_INVOICE_SELECT, customer: { select: { businessName: true, firstName: true, lastName: true } }, payments: { where: { date: yearRange(year) }, select: { amountEur: true } } },
        orderBy: { date: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { tenantId, date: yearRange(year), invoice: { OR: [{ date: { lt: yearRange(year).gte } }, { date: { gte: yearRange(year).lt } }] } },
        select: { amountEur: true, invoice: { select: { id: true, number: true, date: true, ...REVENUE_INVOICE_SELECT, customer: { select: { businessName: true, firstName: true, lastName: true } } } } },
      }),
    ]);
    // Revenue of the issued invoices of the year (credit notes negative), and the part not collected within the year.
    let issuedInYear = 0;
    const notCollectedInYear: RevenueDifference[] = [];
    for (const inv of invoicesOfYear.filter(isIssued)) {
      const sign = inv.type === 'TD04' ? -1 : 1;
      const issued = sign * revenueShare(Number(inv.total) * Number(inv.exchangeRate), inv);
      const collected = inv.payments.reduce((s, p) => s + revenueShare(Number(p.amountEur), inv), 0);
      issuedInYear += issued;
      const missing = roundCents(issued - collected);
      if (Math.abs(missing) >= 0.01) notCollectedInYear.push({ invoiceId: inv.id, number: inv.number, date: inv.date.toISOString().slice(0, 10), customer: customerName(inv.customer), amount: missing });
    }
    // Collections of the year on invoices of other years, one entry per invoice.
    const byInvoice = new Map<string, RevenueDifference>();
    for (const p of paymentsOfYear) {
      const inv = p.invoice;
      const entry = byInvoice.get(inv.id) ?? { invoiceId: inv.id, number: inv.number, date: inv.date.toISOString().slice(0, 10), customer: customerName(inv.customer), amount: 0 };
      entry.amount = roundCents(entry.amount + revenueShare(Number(p.amountEur), inv));
      byInvoice.set(inv.id, entry);
    }
    // LM43/LM44: the substitute tax credit of the previous return (code 1792) in the credit registry, and its uses in the F24 forms.
    const previousCredits = await this.prisma.taxCredit.findMany({
      where: { tenantId, section: 'TREASURY', code: incomeRules.taxCodes.substituteTaxBalance, referenceYear: year - 1 },
      select: { amount: true, usages: { select: { amount: true } } },
    });
    const previousCredit = previousCredits.length === 0 ? undefined : {
      amount: previousCredits.reduce((t, c) => t + Number(c.amount), 0),
      used: previousCredits.reduce((t, c) => t + c.usages.reduce((u, x) => u + Number(x.amount), 0), 0),
    };
    const lm = lmReturnRows({
      scheme: summary.contributions.scheme,
      atecoCode: summary.input.atecoCode,
      collectedRevenue: summary.collectedRevenue,
      tax: summary.result,
      contributionsPaid: summary.input.contributionsPaid,
      taxCredits: summary.input.taxCredits,
      taxAdvancesPaid: summary.input.taxAdvancesPaid,
      reducedRate: reducedRateApplies(incomeRules, year, summary.input.activityStartYear, summary.input.reducedRateEligible),
      previousCredit,
    });
    const rr = await this.contributionRows(tenantId, year, incomeRules, summary, profile);
    return {
      year,
      forms: [
        { id: 'LM' as const, rows: lm },
        ...(rr.length > 0 ? [{ id: 'RR' as const, rows: rr }] : []),
        { id: 'RX' as const, rows: substituteTaxResultRows(lm) },
      ],
      revenue: {
        issuedInYear: roundCents(issuedInYear),
        collectedInYear: summary.collectedRevenue,
        notCollectedInYear,
        collectedFromOtherYears: [...byInvoice.values()].sort((a, b) => a.date.localeCompare(b.date)),
      },
      warnings: summary.warnings,
    };
  }

  /**
   * RR rows of the scheme in the profile: section II for the Gestione Separata, section I for Artigiani and
   * Commercianti; none for a professional fund (its own return) or when the contributions are not computed.
   */
  private async contributionRows(tenantId: string, year: number, rules: FiscalRuleSet, summary: Awaited<ReturnType<TaxesService['summary']>>, profile: { fiscalCode: string; inpsSeniorityBefore1996: boolean; inpsFlatRateReduction: boolean }): Promise<ReturnRow[]> {
    const { result, input, contributions } = summary;
    if (!result.contributionsComputed) return [];
    // The months are 01-12 unless the activity started in the year: then they are the taxpayer's.
    const wholeYear = input.activityStartYear < year;
    if (contributions.scheme === 'INPS_SEPARATE') {
      return separateSchemeReturnRows({
        grossIncome: result.grossIncome,
        inpsTaxableIncome: result.inpsTaxableIncome,
        inpsContribution: result.inpsContribution,
        reducedRate: input.inpsRatePct === rules.inps.reducedRatePct,
        advancesPaid: input.inpsAdvancesPaid,
        wholeYear,
      });
    }
    const kind = contributions.scheme === 'INPS_ARTISANS' ? 'ARTISANS' : contributions.scheme === 'INPS_TRADERS' ? 'TRADERS' : undefined;
    if (!kind || !rules.inpsSelfEmployed || !contributions.fixed) return [];
    // Paid on the minimum income: the fixed installments of the year on the F24 forms marked as paid.
    const fixedLines = await this.prisma.f24Line.findMany({
      where: { f24: { tenantId, status: 'PAID' }, section: 'INPS', code: selfEmployedReasons(rules, kind).fixed, referenceYear: year },
      select: { debitAmount: true },
    });
    return selfEmployedReturnRows({
      fiscalCode: profile.fiscalCode,
      inpsCode: input.inpsExcessCode ?? undefined,
      grossIncome: result.grossIncome,
      incomeFloor: rules.inpsSelfEmployed.incomeFloor,
      fixed: contributions.fixed,
      fixedPaid: roundCents(fixedLines.reduce((s, l) => s + Number(l.debitAmount), 0)),
      excess: { inpsTaxableIncome: result.inpsTaxableIncome, inpsContribution: result.inpsContribution },
      excessPaid: input.inpsAdvancesPaid,
      flatRateReduction: profile.inpsFlatRateReduction,
      seniorityBefore1996: profile.inpsSeniorityBefore1996,
      wholeYear,
    });
  }
}
