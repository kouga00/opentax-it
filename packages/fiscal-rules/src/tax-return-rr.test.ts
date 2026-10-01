import { describe, expect, it } from 'vitest';
import { selfEmployedReturnRows, separateSchemeReturnRows, substituteTaxResultRows } from './tax-return-rr';

const byId = (rows: Array<{ id: string; value: unknown; action: string }>) => Object.fromEntries(rows.map((r) => [r.id, r]));

describe('separateSchemeReturnRows (RR section II, Gestione Separata)', () => {
  it('writes income, taxable income, rate code C, contribution and the balance in RR7', () => {
    const r = byId(separateSchemeReturnRows({ grossIncome: 30533, inpsTaxableIncome: 30533, inpsContribution: 7959.96, reducedRate: false, advancesPaid: 5000, wholeYear: true }));
    expect(r['RR5.1'].value).toBe('1');
    expect(r['RR5.11'].value).toBe(30533);
    expect(r['RR5.12'].value).toBe('01');
    expect(r['RR5.14'].value).toBe('C');
    expect(r['RR5.15'].value).toBe(7960);
    expect(r['RR6.2'].value).toBe(5000);
    expect(r['RR7'].value).toBe(2960);
    expect(r['RR8.1']).toBeUndefined();
  });

  it('gives a credit in RR8 with rate code A, and leaves the months to the taxpayer in a part year', () => {
    const r = byId(separateSchemeReturnRows({ grossIncome: 10000, inpsTaxableIncome: 10000, inpsContribution: 2400, reducedRate: true, advancesPaid: 3000, wholeYear: false }));
    expect(r['RR5.14'].value).toBe('A');
    expect(r['RR5.12']).toMatchObject({ value: null, action: 'YOURS' });
    expect(r['RR8.1'].value).toBe(600);
    expect(r['RR8.2'].value).toBe(600);
    expect(r['RR7']).toBeUndefined();
  });
});

describe('selfEmployedReturnRows (RR section I, Artigiani and Commercianti)', () => {
  const base = { fiscalCode: 'RSSMRA80A01H501U', inpsCode: '12345678901234567', grossIncome: 30000, incomeFloor: 18555, fixed: { ivs: 4453.2, maternity: 7.44 }, fixedPaid: 4460.64, excess: { inpsTaxableIncome: 11445, inpsContribution: 2747 }, excessPaid: 2000, flatRateReduction: false, seniorityBefore1996: false, wholeYear: true };

  it('fills the owner row with the minimum, the income above it and the balances', () => {
    const r = byId(selfEmployedReturnRows(base));
    expect(r['RR2.type'].value).toBe('1');
    expect(r['RR2.2'].value).toBe('12345678901234567');
    expect(r['RR2.3']).toMatchObject({ value: 30000, action: 'ENTER' });
    expect(r['RR2.6'].value).toBe('X');
    expect(r['RR2.7']).toBeUndefined();
    expect(r['RR2.10'].value).toBe(18555);
    expect(r['RR2.11'].value).toBe(4453);
    expect(r['RR2.12'].value).toBe(7);
    expect(r['RR2.16'].value).toBe(0);
    expect(r['RR2.24']).toMatchObject({ value: 11445, action: 'ENTER' });
    expect(r['RR2.25'].value).toBe(2747);
    expect(r['RR2.29'].value).toBe(747);
    expect(r['RR4.1']).toBeUndefined();
  });

  it('marks the 35% reduction with code C, and puts the credits in RR4', () => {
    const r = byId(selfEmployedReturnRows({ ...base, flatRateReduction: true, seniorityBefore1996: true, excessPaid: 3000, inpsCode: undefined }));
    expect(r['RR2.7'].value).toBe('C');
    expect(r['RR2.6']).toBeUndefined();
    expect(r['RR2.2']).toMatchObject({ value: null, action: 'YOURS' });
    expect(r['RR2.30'].value).toBe(253);
    expect(r['RR4.1'].value).toBe(253);
  });
});

describe('substituteTaxResultRows (RX31)', () => {
  it('reports LM46 in col. 1 or LM47 in col. 2 with the credit to compensate in col. 5', () => {
    expect(substituteTaxResultRows([{ id: 'LM46', row: 'LM46', value: 765, action: 'RESULT' }])).toEqual([expect.objectContaining({ id: 'RX31.1', value: 765 })]);
    expect(substituteTaxResultRows([{ id: 'LM47', row: 'LM47', value: 500, action: 'RESULT' }]).map((r) => [r.id, r.value])).toEqual([['RX31.2', 500], ['RX31.5', 500]]);
  });
});
