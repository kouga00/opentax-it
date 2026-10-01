import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ExchangeRatesService } from './exchange-rates.service.js';

/** In-memory stand-in for the two cache tables. */
function memoryPrisma() {
  const days = new Map<string, number>();
  const rates = new Map<string, number>();
  const key = (d: Date, c: string) => `${d.toISOString().slice(0, 10)}|${c}`;
  const prisma = {
    exchangeRateDay: {
      findUnique: vi.fn(({ where }: { where: { date: Date } }) => Promise.resolve(days.has(where.date.toISOString().slice(0, 10)) ? {} : null)),
      create: vi.fn(({ data }: { data: { date: Date; records: number } }) => (days.set(data.date.toISOString().slice(0, 10), data.records), Promise.resolve(data))),
    },
    exchangeRate: {
      findUnique: vi.fn(({ where }: { where: { date_currency: { date: Date; currency: string } } }) => {
        const v = rates.get(key(where.date_currency.date, where.date_currency.currency));
        return Promise.resolve(v === undefined ? null : { unitsPerEur: v, source: 'test' });
      }),
      upsert: vi.fn(({ create }: { create: { date: Date; currency: string; unitsPerEur: number } }) => (rates.set(key(create.date, create.currency), create.unitsPerEur), Promise.resolve(create))),
    },
    $transaction: vi.fn((ops: Array<Promise<unknown>>) => Promise.all(ops)),
  };
  return { prisma: prisma as unknown as PrismaService, days };
}

const feed: Record<string, Array<{ isoCode: string; avgRate: string }>> = {
  '2026-09-18': [{ isoCode: 'USD', avgRate: '1.1460' }],
  '2026-09-19': [],
  '2026-09-20': [],
};

describe('ExchangeRatesService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uses the previous quoted day for a Sunday (TUIR art. 9 par. 2) and downloads each day once', async () => {
    const fetchMock = vi.fn((url: string) => {
      const date = new URL(url).searchParams.get('referenceDate') ?? '';
      const rates = (feed[date] ?? []).map((r) => ({ ...r, referenceDate: date, exchangeConventionCode: 'C' }));
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ rates }) });
    });
    vi.stubGlobal('fetch', fetchMock);
    const { prisma, days } = memoryPrisma();
    const service = new ExchangeRatesService(prisma);

    await expect(service.rate('usd', '2026-09-20')).resolves.toMatchObject({ currency: 'USD', requestedDate: '2026-09-20', quotationDate: '2026-09-18', unitsPerEur: 1.146 });
    expect(fetchMock).toHaveBeenCalledTimes(3); // 20, 19 (empty, remembered), 18
    expect(days.get('2026-09-19')).toBe(0);

    await service.rate('USD', '2026-09-20');
    expect(fetchMock).toHaveBeenCalledTimes(3); // second time from the cache
  });

  it('returns 1 for EUR without calling Banca d\'Italia', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(new ExchangeRatesService(memoryPrisma().prisma).rate('EUR', '2026-09-20')).resolves.toMatchObject({ unitsPerEur: 1 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
