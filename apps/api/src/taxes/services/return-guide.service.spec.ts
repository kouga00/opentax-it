import { describe, expect, it, vi } from 'vitest';
import { ruleSet2025 } from '@opentax-it/fiscal-rules';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { ReturnGuideService } from './return-guide.service.js';
import type { TaxesService } from './taxes.service.js';
import type { TenantsService } from '../../tenants/tenants.service.js';

const customer = { businessName: 'Cliente Srl', firstName: null, lastName: null };
const invoice = (id: string, date: string, total: number, payments: number[], extra: object = {}) => ({ id, number: id, date: new Date(`${date}T00:00:00Z`), type: 'TD01', status: 'DELIVERED', imported: false, exchangeRate: 1, total, professionalFundContribution: 0, customer, payments: payments.map((amountEur) => ({ amountEur })), ...extra });

function service(invoices: unknown[], otherYearPayments: unknown[]) {
  const summary = {
    collectedRevenue: 1600,
    warnings: [],
    contributions: { scheme: 'INPS_SEPARATE' },
    input: { atecoCode: '62.02.00', activityStartYear: 2015, reducedRateEligible: false, contributionsPaid: 0, taxCredits: 0, taxAdvancesPaid: 0, inpsAdvancesPaid: 0, inpsRatePct: 26.07 },
    result: { coefficientPct: 67, grossIncome: 1072, contributionsDeducted: 0, netIncome: 1072, taxRatePct: 15, substituteTax: 161, taxNetOfCredits: 161, contributionsComputed: true, inpsTaxableIncome: 1072, inpsContribution: 279.47 },
  };
  const taxes = { summary: vi.fn().mockResolvedValue(summary), rulesForTaxYear: vi.fn().mockResolvedValue({ incomeRules: ruleSet2025 }) } as unknown as TaxesService;
  const prisma = { invoice: { findMany: vi.fn().mockResolvedValue(invoices) }, payment: { findMany: vi.fn().mockResolvedValue(otherYearPayments) }, taxCredit: { findMany: vi.fn().mockResolvedValue([]) } } as unknown as PrismaService;
  const tenants = { getWithProfile: vi.fn().mockResolvedValue({ profile: { fiscalCode: 'RSSMRA80A01H501U', inpsSeniorityBefore1996: false, inpsFlatRateReduction: false } }) } as unknown as TenantsService;
  return new ReturnGuideService(prisma, taxes, tenants);
}

describe('ReturnGuideService: revenue proposed by the pre-filled return (by issue date) against the collected one', () => {
  it('lists the invoices of the year not collected in the year and those of other years collected in it', async () => {
    const guide = await service(
      [
        invoice('1/2025', '2025-03-10', 1000, [1000]),
        invoice('2/2025', '2025-12-20', 800, [300]),
        invoice('3/2025', '2025-06-01', 500, [], { status: 'REJECTED' }),
      ],
      [{ amountEur: 300, invoice: { id: '9/2024', number: '9/2024', date: new Date('2024-12-15T00:00:00Z'), total: 300, professionalFundContribution: 0, customer } }],
    ).guide('t1', 2025);
    expect(guide.revenue.issuedInYear).toBe(1800);
    expect(guide.revenue.notCollectedInYear).toEqual([expect.objectContaining({ number: '2/2025', amount: 500 })]);
    expect(guide.revenue.collectedFromOtherYears).toEqual([expect.objectContaining({ number: '9/2024', amount: 300, date: '2024-12-15' })]);
    // Proposed − not collected + collected from other years = collected in the year.
    expect(guide.revenue.issuedInYear - 500 + 300).toBe(guide.revenue.collectedInYear);
    const rows = Object.fromEntries(guide.forms.map((f) => [f.id, f.rows]));
    expect(guide.forms.map((f) => f.id)).toEqual(['LM', 'RR', 'RX']);
    expect(rows.LM.find((r) => r.id === 'LM22.3')).toMatchObject({ value: 1600, action: 'CHECK' });
    expect(rows.RR.find((r) => r.id === 'RR5.15')).toMatchObject({ value: 279, action: 'ENTER' });
    expect(rows.RR.find((r) => r.id === 'RR5.14')?.value).toBe('C');
    expect(rows.RX).toEqual([expect.objectContaining({ id: 'RX31.1', value: 161 })]);
  });
});
