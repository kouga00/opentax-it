import { buildDeadlines, ruleSet2026 } from '@opentax-it/fiscal-rules';
import { describe, expect, it, vi } from 'vitest';
import type { FiscalRulesService } from '../../fiscal-rules/fiscal-rules.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { StampDutyService } from './stamp-duty.service.js';

// Q1 and Q2 below 5,000 EUR: both deferred to 30 November with Q3 (AdE stamp duty guide, note **).
const amounts = { 1: 4, 2: 6, 3: 2, 4: 0 };

describe('StampDutyService', () => {
  const setup = (periods: object[] = []) => {
    const f24Create = vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'f1', ...data, lines: data.lines.create }));
    const upsert = vi.fn();
    const tx = { f24: { create: f24Create }, stampDutyPeriod: { upsert } };
    const prisma = { stampDutyPeriod: { findMany: vi.fn().mockResolvedValue(periods), upsert }, $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } as unknown as PrismaService;
    const rules = {
      getActive: vi.fn().mockResolvedValue(ruleSet2026),
      deadlines: vi.fn().mockResolvedValue(buildDeadlines(ruleSet2026, { stampDutyByQuarter: amounts })),
      stampDutyByQuarter: vi.fn().mockResolvedValue({ amounts, estimatedQuarters: [3] }),
    } as unknown as FiscalRulesService;
    return { f24Create, upsert, service: new StampDutyService(prisma, rules) };
  };

  it('lists the quarters with estimate, deferral and the dates of list B and of the amount', async () => {
    const [q1, , q3] = await setup().service.list('t1', 2026);
    expect([q1.taxCode, q1.paymentDeadline, q1.deferredFrom, q1.listBChangesBy]).toEqual(['2521', '2026-11-30', '2026-05-31', '2026-04-30']);
    expect([q3.estimatedAmount, q3.estimated, q3.amountAvailableOn]).toEqual([2, true, '2026-11-15']);
  });

  it('creates the F24 of a deferred quarter with its own code, the year of the quarter and the AdE amount', async () => {
    const { service, f24Create, upsert } = setup();
    await service.createF24('t1', 2026, 1, { amount: 6 });
    const data = f24Create.mock.calls[0][0].data;
    expect([data.kind, data.paymentDate.toISOString().slice(0, 10), data.totalDebit]).toEqual(['STAMP_DUTY', '2026-11-30', 6]);
    expect(data.lines.create[0]).toMatchObject({ section: 'TREASURY', code: '2521', referenceYear: 2026, debitAmount: 6 });
    expect(upsert.mock.calls[0][0].create).toMatchObject({ quarter: 1, computedAmount: 4, dueAmount: 6, f24Id: 'f1' });
  });

  it('refuses a payment date after the deadline, a second F24 and an F24 for a quarter paid from the portal', async () => {
    await expect(setup().service.createF24('t1', 2026, 3, { amount: 2, paymentDate: '2026-12-01' })).rejects.toThrow('ravvedimento');
    await expect(setup([{ quarter: 3, f24: { id: 'f9', status: 'PLANNED', paymentDate: new Date('2026-11-30'), paidOn: null } }]).service.createF24('t1', 2026, 3, { amount: 2 })).rejects.toThrow('già un F24');
    await expect(setup([{ quarter: 3, paidOn: new Date('2026-11-20'), f24: null }]).service.createF24('t1', 2026, 3, { amount: 2 })).rejects.toThrow('dal portale');
  });

  it('ignores a cancelled F24', async () => {
    const { service, f24Create } = setup([{ quarter: 3, f24: { id: 'f9', status: 'CANCELLED', paymentDate: new Date('2026-11-30'), paidOn: null } }]);
    await service.createF24('t1', 2026, 3, { amount: 2 });
    expect(f24Create).toHaveBeenCalled();
  });
});
