import { describe, expect, it, vi } from 'vitest';
import type { FiscalRulesService } from '../../fiscal-rules/fiscal-rules.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { TenantsService } from '../../tenants/tenants.service.js';
import { ContributionF24Service } from './contribution-f24.service.js';

const forense = (reason: string, amount: number) => ({ section: 'OTHER_ENTITY' as const, entityCode: '0013', reason, periodFrom: '01/2026', periodTo: '12/2026', amount });

describe('ContributionF24Service', () => {
  const setup = () => {
    const create = vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, lines: data.lines.create }));
    return { create, service: new ContributionF24Service({ f24: { create } } as unknown as PrismaService, {} as FiscalRulesService, {} as TenantsService) };
  };

  it('creates a form with the fund rows, their description and the deductible part (LM35)', async () => {
    const { service } = setup();
    const f24 = (await service.create('t1', { paymentDate: '2026-09-30', lines: [forense('E102', 300), forense('E103', 120)] })) as unknown as { kind: string; totalDebit: number; lines: Array<{ code: string; entityCode: string; role: string; deductibleAmount: number; description: string; referenceYear: number }> };
    expect(f24.kind).toBe('OTHER');
    expect(f24.totalDebit).toBe(420);
    expect(f24.lines.map((l) => [l.code, l.entityCode, l.role, l.deductibleAmount, l.referenceYear])).toEqual([
      ['E102', '0013', 'CONTRIBUTION', 300, 2026],
      ['E103', '0013', 'CONTRIBUTION', 0, 2026],
    ]);
    expect(f24.lines[0].description).toMatch(/^Cassa Forense - /);
  });

  it('refuses rows against the entity rules and more rows than the model has', async () => {
    const { service, create } = setup();
    await expect(service.create('t1', { paymentDate: '2026-09-30', lines: [forense('E999', 10)] })).rejects.toThrow('Riga 1: La causale E999');
    await expect(service.create('t1', { paymentDate: '2026-09-30', lines: [forense('E100', 1), forense('E101', 1), forense('E102', 1)] })).rejects.toThrow('2 righe');
    expect(create).not.toHaveBeenCalled();
  });

  it('keeps a paid form, like the forms of a plan', async () => {
    const remove = (status: string) => {
      const del = vi.fn();
      const prisma = { f24: { findFirst: vi.fn().mockResolvedValue({ planId: null, kind: 'OTHER', status }), delete: del } } as unknown as PrismaService;
      return { del, run: new ContributionF24Service(prisma, {} as FiscalRulesService, {} as TenantsService).remove('t1', 'f1') };
    };
    await expect(remove('PAID').run).rejects.toThrow('pagato');
    const planned = remove('PLANNED');
    await planned.run;
    expect(planned.del).toHaveBeenCalled();
  });
});
