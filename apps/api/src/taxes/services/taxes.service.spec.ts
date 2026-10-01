import { describe, expect, it, vi } from 'vitest';
import { ruleSet2026 } from '@opentax-it/fiscal-rules';
import type { FiscalRulesService } from '../../fiscal-rules/fiscal-rules.service.js';
import type { PaymentsService } from '../../payments/services/payments.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { TenantsService } from '../../tenants/tenants.service.js';
import { TaxesService } from './taxes.service.js';

describe('TaxesService.paidFromF24', () => {
  it('excludes the deferral surcharge from the advances carried to the return (LM45)', async () => {
    const findMany = vi
      .fn()
      // advances for the year: 1790 with 2 of surcharge inside, INPS acconto (surcharge already on DPPI)
      .mockResolvedValueOnce([
        { section: 'TREASURY', debitAmount: '502.00', surchargeAmount: '2.00' },
        { section: 'INPS', debitAmount: '500.00', surchargeAmount: '0.00' },
      ])
      // INPS contributions paid in the year
      .mockResolvedValueOnce([
        { role: 'BALANCE', debitAmount: '500.00', surchargeAmount: '0.00', deductibleAmount: '0.00' },
        // Cassa Forense rows entered by hand: personal contribution deductible, contribution charged on invoices not.
        { role: 'CONTRIBUTION', debitAmount: '300.00', surchargeAmount: '0.00', deductibleAmount: '300.00' },
        { role: 'CONTRIBUTION', debitAmount: '120.00', surchargeAmount: '0.00', deductibleAmount: '0.00' },
      ]);
    const service = new TaxesService({ f24Line: { findMany } } as unknown as PrismaService, {} as FiscalRulesService, {} as PaymentsService, {} as TenantsService);

    await expect(service.paidFromF24('t1', 2026)).resolves.toEqual({ taxAdvancesPaid: 500, inpsAdvancesPaid: 500, contributionsPaid: 800 });
  });
});

describe('TaxesService.summary and the social security scheme', () => {
  const serviceFor = (socialSecurityScheme: string) => {
    const profile = { socialSecurityScheme, atecoCode: '62.02', activityStartYear: 2020, reducedRate: false, isaSubject: false, inpsFlatRateReduction: false, inpsSeniorityBefore1996: false };
    const yearData = { contributionsPaid: '4000', taxAdvancesPaid: '0', inpsAdvancesPaid: '1000', taxCredits: '0', inpsReducedRate: false };
    const prisma = {
      taxYearData: { upsert: vi.fn().mockResolvedValue(yearData) },
      f24Line: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const rules = { getActive: vi.fn().mockResolvedValue(ruleSet2026) } as unknown as FiscalRulesService;
    const payments = { collectedRevenue: vi.fn().mockResolvedValue(50_000) } as unknown as PaymentsService;
    const tenants = { getWithProfile: vi.fn().mockResolvedValue({ profile }) } as unknown as TenantsService;
    return new TaxesService(prisma, rules, payments, tenants);
  };

  it('computes the Gestione Separata contributions and advances', async () => {
    const s = await serviceFor('INPS_SEPARATE').summary('t1', 2026);
    expect(s.contributions).toMatchObject({ scheme: 'INPS_SEPARATE', computed: true, fixed: null });
    expect(s.result.inpsContribution).toBeGreaterThan(0);
    expect(s.nextYearAdvances.inps.total).toBeGreaterThan(0);
  });

  it('for an artisan: fixed contribution in four installments, contribution above the minimum, advances in two equal parts', async () => {
    const s = await serviceFor('INPS_ARTISANS').summary('t1', 2026);
    expect(s.contributions.fixed?.total).toBe(4_521.36);
    // 50,000 × 67% = 33,500; (33,500 − 18,808) × 24% = 3,526.08 → 3,526 (whole euros); advances 1,763.04 + 1,763.04.
    expect(s.result.inpsContribution).toBe(3_526);
    expect(s.nextYearAdvances.inps).toEqual({ total: 3_526.08, first: 1_763.04, second: 1_763.04, mode: 'TWO_INSTALMENTS' });
  });

  it('for a professional fund: no INPS amounts, the contributions entered by hand still deducted (LM35)', async () => {
    const s = await serviceFor('PROFESSIONAL_FUND').summary('t1', 2026);
    expect(s.contributions).toMatchObject({ scheme: 'PROFESSIONAL_FUND', computed: false, fixed: null });
    expect(s.result.inpsContribution).toBe(0);
    expect(s.inpsBalance).toBe(0);
    expect(s.nextYearAdvances.inps).toEqual({ total: 0, first: 0, second: 0, mode: 'NOT_DUE' });
    expect(s.result.contributionsDeducted).toBe(4_000);
  });
});
