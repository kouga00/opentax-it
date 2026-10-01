import { NotFoundException } from '@nestjs/common';
import { ruleSet2025, ruleSet2026 } from '@opentax-it/fiscal-rules';
import { describe, expect, it } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { FiscalRulesService } from './fiscal-rules.service.js';

const row = (id: string, version: number, status: string, rules: typeof ruleSet2026) => {
  const { sourceRefs, ...data } = rules;
  return { id, year: 2026, version, status, data, sourceRefs, notes: null, activatedAt: null, createdAt: new Date('2026-09-24') };
};

// The 2025 values under the 2026 year stand in for an older active set with different values.
const rows = [row('active', 5, 'ACTIVE', ruleSet2025), row('draft', 6, 'DRAFT', ruleSet2026)];
const prisma = {
  fiscalRuleSet: {
    findUnique: ({ where }: { where: { id: string } }) => Promise.resolve(rows.find((r) => r.id === where.id) ?? null),
    findFirst: ({ where }: { where: { status: string } }) => Promise.resolve(rows.find((r) => r.status === where.status) ?? null),
  },
} as unknown as PrismaService;
const service = new FiscalRulesService(prisma);

describe('FiscalRulesService.describe', () => {
  it('gives every value with the source entry that covers it', async () => {
    const d = await service.describe('active');
    expect(d).toMatchObject({ version: 5, status: 'ACTIVE', comparison: null });
    expect(d.fields.find((f) => f.path === 'inps.fullRatePct')).toMatchObject({ value: 26.07, refKey: 'inps.fullRatePct', ref: { sourceId: 'inps-circ-27-2025' } });
    expect(d.fields.find((f) => f.path === 'taxCodes.substituteTaxBalance')).toMatchObject({ value: '1792', refKey: 'taxCodes' });
    expect(d.fields.every((f) => f.ref)).toBe(true);
    expect(d.documents.map((x) => x.key)).toContain('inpsReasons.table');
  });

  it('compares a draft with the active set of its year', async () => {
    const d = await service.describe('draft');
    expect(d.comparison?.against).toEqual({ id: 'active', version: 5 });
    expect(d.comparison?.values).toContainEqual({ path: 'inps.incomeCeiling', before: 120_607, after: 122_295 });
    expect(d.comparison?.sources.map((s) => s.key)).toContain('inps.incomeCeiling');
  });

  it('refuses an unknown set', async () => {
    await expect(service.describe('missing')).rejects.toThrow(NotFoundException);
  });
});

describe('FiscalRulesService.stampDutyByQuarter (AdE stamp duty guide, June 2026)', () => {
  const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
  const invoices = [
    // Dated 30 March, delivered 1 April: second quarter, as in the example of the guide.
    { date: day('2026-03-30'), sdiDeliveredOn: day('2026-04-01'), stampAmount: 2 },
    { date: day('2026-03-10'), sdiDeliveredOn: day('2026-03-10'), stampAmount: 2 },
    // Not delivered yet: placed by its own date, and the quarter is an estimate.
    { date: day('2026-05-20'), sdiDeliveredOn: null, stampAmount: 2 },
  ];
  const stampPrisma = { invoice: { findMany: () => Promise.resolve(invoices) } } as unknown as PrismaService;

  it('places each invoice by its delivery date and flags the quarters with invoices not delivered yet', async () => {
    const r = await new FiscalRulesService(stampPrisma).stampDutyByQuarter('t1', 2026);
    expect(r.amounts).toEqual({ 1: 2, 2: 4, 3: 0, 4: 0 });
    expect(r.estimatedQuarters).toEqual([2]);
  });
});
