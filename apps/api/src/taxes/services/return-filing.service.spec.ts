import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ruleSet2025 } from '@opentax-it/fiscal-rules';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { ReturnFilingService } from './return-filing.service.js';
import type { ReturnGuideService } from './return-guide.service.js';
import type { TaxesService } from './taxes.service.js';

const row = (id: string, value: number) => ({ id, row: id.split('.')[0], value, action: 'RESULT' as const });
const guide = { forms: [{ id: 'LM', rows: [row('LM35.1', 5000), row('LM47', 500)] }, { id: 'RR', rows: [row('RR8.1', 300), row('RR8.2', 300)] }, { id: 'RX', rows: [row('RX31.2', 500), row('RX31.5', 500)] }] };
const summary = {
  collectedRevenue: 30000,
  contributions: { scheme: 'INPS_SEPARATE' },
  input: { inpsRatePct: 26.07, inpsAdvancesPaid: 3000 },
  result: { coefficientPct: 67, grossIncome: 20100, contributionsDeducted: 5000, netIncome: 15100, taxRatePct: 15, substituteTax: 2265, inpsTaxableIncome: 20100, inpsContribution: 2700 },
  inpsBalance: -300,
  nextYearAdvances: { tax: { total: 2265 }, inps: { total: 2160 } },
};

function service(existing: object | null = null) {
  const created: unknown[] = [];
  const tx = {
    taxReturn: { upsert: vi.fn().mockResolvedValue({ id: 'r1' }) },
    taxCredit: { create: vi.fn().mockImplementation(({ data }) => { created.push(data); return Promise.resolve(data); }) },
  };
  const findUnique = vi.fn().mockResolvedValueOnce(existing).mockResolvedValue({ status: 'FILED', filedOn: new Date('2026-09-30T00:00:00Z'), credits: [] });
  const prisma = { taxReturn: { findUnique }, $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } as unknown as PrismaService;
  const guides = { guide: vi.fn().mockResolvedValue(guide) } as unknown as ReturnGuideService;
  const taxes = { summary: vi.fn().mockResolvedValue(summary), rulesForTaxYear: vi.fn().mockResolvedValue({ incomeRules: ruleSet2025 }) } as unknown as TaxesService;
  return { created, tx, service: new ReturnFilingService(prisma, guides, taxes) };
}

describe('ReturnFilingService', () => {
  it('saves the filed return and registers the substitute tax (1792) and Gestione Separata (PXX) credits to compensate', async () => {
    const { service: s, created, tx } = service();
    await s.markFiled('t1', 2025, '2026-09-30');
    expect(tx.taxReturn.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ year: 2025, status: 'FILED', taxCredit: 500, inpsCredit: 300 }) }));
    expect(created).toEqual([
      expect.objectContaining({ section: 'TREASURY', code: '1792', referenceYear: 2025, amount: 500, taxReturnId: 'r1' }),
      expect.objectContaining({ section: 'INPS', code: 'PXX', referenceYear: 2025, amount: 300 }),
    ]);
  });

  it('refuses a return already marked as filed, and going back when a credit is used in an F24', async () => {
    await expect(service({ status: 'FILED', filedOn: new Date('2026-09-01T00:00:00Z'), credits: [] }).service.markFiled('t1', 2025, '2026-09-30')).rejects.toThrow(ConflictException);
    const prisma = { taxReturn: { findUnique: vi.fn().mockResolvedValue({ id: 'r1', credits: [{ usages: [{ id: 'u1' }] }] }) } } as unknown as PrismaService;
    await expect(new ReturnFilingService(prisma, {} as ReturnGuideService, {} as TaxesService).unmark('t1', 2025)).rejects.toThrow('già usato in un F24');
  });
});
