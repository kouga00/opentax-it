import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { TaxCreditsService } from './tax-credits.service.js';

const credit = (over: object = {}) => ({
  id: 'c1',
  section: 'TREASURY',
  code: '1792',
  referenceYear: 2024,
  amount: 500,
  usableFrom: null,
  createdAt: new Date('2025-10-01T00:00:00Z'),
  absorbedByReturnId: null,
  absorbedByReturn: null,
  usages: [{ amount: 200 }],
  ...over,
});

const service = (rows: object[]) => new TaxCreditsService({ taxCredit: { findMany: vi.fn().mockResolvedValue(rows), findFirst: vi.fn().mockResolvedValue({ ...rows[0], usages: [] }) } } as unknown as PrismaService);

describe('TaxCreditsService', () => {
  it('leaves what F24 did not use available', async () => {
    expect((await service([credit()]).available('t1')).map((c) => c.amount)).toEqual([300]);
  });

  it('closes a credit absorbed by the next return (LM43 − LM44 lowers LM46, Redditi PF booklet 3)', async () => {
    const s = service([credit({ absorbedByReturnId: 'r1', absorbedByReturn: { year: 2025 } })]);
    expect((await s.list('t1'))[0]).toMatchObject({ used: 200, remaining: 0 });
    expect(await s.available('t1')).toEqual([]);
    await expect(s.remove('t1', 'c1')).rejects.toThrow(ConflictException);
  });
});
