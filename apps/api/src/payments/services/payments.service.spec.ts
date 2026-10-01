import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { PaymentsService } from './payments.service.js';

function service(currency: string, paymentMethod: string | null = null, invoice: { type?: string; total?: number } = {}, recorded = 0) {
  const create = vi.fn().mockImplementation(({ data }: { data: unknown }) => Promise.resolve(data));
  const payment = { create, aggregate: vi.fn().mockResolvedValue({ _sum: { amount: recorded } }) };
  const prisma = {
    invoice: { findFirst: vi.fn().mockResolvedValue({ id: 'inv1', tenantId: 't1', status: 'ISSUED', type: 'TD01', total: 100_000, currency, exchangeRate: 0.9, paymentMethod, ...invoice }) },
    payment,
    $transaction: (fn: (tx: unknown) => unknown) => fn({ $executeRaw: vi.fn(), payment }),
  } as unknown as PrismaService;
  return new PaymentsService(prisma);
}

describe('PaymentsService.create in foreign currency (TUIR art. 9 par. 2)', () => {
  it('refuses a USD collection without the rate of the collection day', async () => {
    await expect(service('USD').create('t1', 'inv1', { date: '2026-09-24', amount: 1000 })).rejects.toThrow(BadRequestException);
  });

  it('values the collection at its own rate, not at the invoice rate', async () => {
    const p = await service('USD').create('t1', 'inv1', { date: '2026-09-24', amount: 1000, exchangeRate: 0.85 });
    expect(p).toMatchObject({ amount: 1000, amountEur: 850, exchangeRate: 0.85 });
  });

  it('derives the rate from the EUR amount when given', async () => {
    const p = await service('USD').create('t1', 'inv1', { date: '2026-09-24', amount: 1000, amountEur: 870 });
    expect(p).toMatchObject({ amountEur: 870, exchangeRate: 0.87 });
  });

  it('EUR invoices keep rate 1', async () => {
    const p = await service('EUR').create('t1', 'inv1', { date: '2026-09-24', amount: 500 });
    expect(p).toMatchObject({ amountEur: 500, exchangeRate: 1 });
  });
});

describe('PaymentsService.create payment method', () => {
  it('takes the method asked in the invoice (ModalitaPagamento) when none is given', async () => {
    const p = await service('EUR', 'MP05').create('t1', 'inv1', { date: '2026-09-24', amount: 500 });
    expect(p).toMatchObject({ method: 'MP05' });
  });

  it('keeps a method given explicitly', async () => {
    const p = await service('EUR', 'MP05').create('t1', 'inv1', { date: '2026-09-24', amount: 500, method: 'MP08' });
    expect(p).toMatchObject({ method: 'MP08' });
  });
});

describe('PaymentsService.create within the document total', () => {
  it('refuses a second collection of an invoice already collected in full', async () => {
    await expect(service('EUR', null, { total: 1042 }, 1042).create('t1', 'inv1', { date: '2026-09-24', amount: 1042 })).rejects.toThrow('già incassato del tutto');
  });

  it('refuses an amount above what is left to collect', async () => {
    await expect(service('EUR', null, { total: 1042 }, 500).create('t1', 'inv1', { date: '2026-09-24', amount: 600 })).rejects.toThrow('residuo da incassare (542,00 EUR)');
  });

  it('records the rest of an invoice collected in part', async () => {
    const p = await service('EUR', null, { total: 1042 }, 500).create('t1', 'inv1', { date: '2026-09-24', amount: 542 });
    expect(p).toMatchObject({ amount: 542 });
  });

  it('gives money back only up to what was collected', async () => {
    await expect(service('EUR', null, { total: 1042 }, 500).create('t1', 'inv1', { date: '2026-09-24', amount: -600 })).rejects.toThrow('già incassato (500,00 EUR)');
    await expect(service('EUR', null, { total: 1042 }, 500).create('t1', 'inv1', { date: '2026-09-24', amount: -500 })).resolves.toMatchObject({ amount: -500 });
  });

  it('bounds the refunds of a credit note, recorded as negative amounts, by its total', async () => {
    await expect(service('EUR', null, { type: 'TD04', total: 300 }, -300).create('t1', 'inv1', { date: '2026-09-24', amount: -1 })).rejects.toThrow('già rimborsato del tutto');
    await expect(service('EUR', null, { type: 'TD04', total: 300 }, -100).create('t1', 'inv1', { date: '2026-09-24', amount: -200 })).resolves.toMatchObject({ amount: -200 });
  });
});

describe('PaymentsService.create on the collection date', () => {
  it('refuses a collection dated in the future (cash basis)', async () => {
    await expect(service('EUR').create('t1', 'inv1', { date: '2999-01-01', amount: 10 })).rejects.toThrow('nel futuro');
  });
});

describe('PaymentsService.collection', () => {
  const payment = (amount: number) => ({ id: `p${amount}`, amount, date: new Date('2026-09-01T00:00:00Z') });
  const withInvoice = (invoice: object | null) =>
    new PaymentsService({ invoice: { findFirst: vi.fn().mockResolvedValue(invoice) } } as unknown as PrismaService);

  it('gives what is left to collect on an invoice paid in part', async () => {
    const c = await withInvoice({ id: 'inv1', type: 'TD01', currency: 'EUR', total: 1042, paymentMethod: 'MP05', payments: [payment(500), payment(200.1)] }).collection('t1', 'inv1');
    expect(c).toMatchObject({ refund: false, total: 1042, collected: 700.1, remaining: 341.9, paymentMethod: 'MP05' });
  });

  it('counts the refunds of a credit note, recorded as negative amounts, as collected', async () => {
    const c = await withInvoice({ id: 'nc1', type: 'TD04', currency: 'EUR', total: 300, paymentMethod: null, payments: [payment(-100)] }).collection('t1', 'nc1');
    expect(c).toMatchObject({ refund: true, collected: 100, remaining: 200 });
  });

  it('is not found for a document of another tenant', async () => {
    await expect(withInvoice(null).collection('t1', 'other')).rejects.toThrow('non trovata');
  });
});
