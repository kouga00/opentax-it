import { describe, expect, it } from 'vitest';
import { parseIsoDate, toIsoDate } from './calendar.js';
import { buildDeadlines } from './deadlines.js';
import { buildPaymentSchedule } from './f24-schedule.js';
import { selfEmployedAdvance, selfEmployedExcessContribution, selfEmployedFixedContribution } from './inps-self-employed.js';
import { ruleSet2025 } from './rule-sets/2025.js';
import { ruleSet2026 } from './rule-sets/2026.js';

// Real 2026 F24 forms of an artisan in the flat-rate regime, without the 35% reduction, with invented INPS codes.
const artisan = { kind: 'ARTISANS' as const, flatRateReduction: false, seniorityBefore1996: false };
const CODE_2025 = '11111112251000001';
const CODE_2026 = '11111112261000002';

describe('fixed contribution on the minimum income (Circ. INPS 14/2026)', () => {
  it('artisans 2026: 4,521.36 (4,513.92 IVS + 7.44 maternity), four installments of 1,130.34 as on the real forms', () => {
    const f = selfEmployedFixedContribution(ruleSet2026, artisan);
    expect(f).toMatchObject({ ivs: 4_513.92, maternity: 7.44, total: 4_521.36 });
    expect(f.installments).toEqual([
      { number: 1, date: '2026-05-18', amount: 1_130.34 },
      { number: 2, date: '2026-08-20', amount: 1_130.34 },
      { number: 3, date: '2026-11-16', amount: 1_130.34 },
      { number: 4, date: '2027-02-16', amount: 1_130.34 },
    ]);
  });

  it('traders 2026: 4,611.64 (4,604.20 + 7.44); 2025 artisans 4,460.64 (Circ. INPS 38/2025)', () => {
    expect(selfEmployedFixedContribution(ruleSet2026, { ...artisan, kind: 'TRADERS' }).total).toBe(4_611.64);
    expect(selfEmployedFixedContribution(ruleSet2025, artisan).total).toBe(4_460.64);
  });

  it('flat-rate reduction: 35% less on the IVS contribution, maternity in full (Circ. INPS 35/2016); remainder on the last installment', () => {
    const f = selfEmployedFixedContribution(ruleSet2026, { ...artisan, flatRateReduction: true });
    expect(f).toMatchObject({ ivs: 2_934.05, maternity: 7.44, total: 2_941.49 });
    expect(f.installments.map((i) => i.amount)).toEqual([735.37, 735.37, 735.37, 735.38]);
  });
});

describe('contribution above the minimum', () => {
  it('on the income above the minimum, one point more above 56,224, up to the ceiling', () => {
    expect(selfEmployedExcessContribution(ruleSet2026, 18_000, artisan)).toEqual({ inpsTaxableIncome: 0, inpsContribution: 0 });
    // (56,224 − 18,808) × 24% + (60,000 − 56,224) × 25% = 8,979.84 + 944 = 9,923.84 → 9,924
    expect(selfEmployedExcessContribution(ruleSet2026, 60_000, artisan)).toEqual({ inpsTaxableIncome: 41_192, inpsContribution: 9_924 });
    // Ceiling 93,707 with contributions before 1996, 122,295 otherwise.
    expect(selfEmployedExcessContribution(ruleSet2026, 200_000, { ...artisan, seniorityBefore1996: true }).inpsTaxableIncome).toBe(93_707 - 18_808);
    expect(selfEmployedExcessContribution(ruleSet2026, 200_000, artisan).inpsTaxableIncome).toBe(122_295 - 18_808);
  });

  it('advances in two equal parts on the previous income with the following year values: real 2026 forms, 2,866.56 each', () => {
    // 2025 income 42,696: (42,696 − 18,808) × 24% = 5,733.12 → 2,866.56 + 2,866.56 (the November AP row; APR 716.64 × 4).
    expect(selfEmployedAdvance(ruleSet2026, 42_696, artisan)).toEqual({ total: 5_733.12, first: 2_866.56, second: 2_866.56, mode: 'TWO_INSTALMENTS' });
    expect(selfEmployedAdvance(ruleSet2026, 10_000, artisan).mode).toBe('NOT_DUE');
  });
});

describe('F24 plan and deadlines of an artisan', () => {
  it('installment 4 of 4 (16/10/2026) matches the real form: 1792/1790 with 0404 and 1668, APR with API and the INPS code of each year', () => {
    const { forms } = buildPaymentSchedule(ruleSet2026, {
      taxYear: 2025,
      contributionScheme: 'INPS_ARTISANS',
      inpsPositionCodes: { 2025: CODE_2025, 2026: CODE_2026 },
      amounts: { taxBalance: 2_534, taxFirstAdvance: 2_819.52, taxSecondAdvance: 0, inpsBalance: 2_826, inpsFirstAdvance: 2_866.56, inpsSecondAdvance: 2_866.56 },
      inpsOfficeCode: '5500',
      inpsReducedRate: false,
      firstDueDate: parseIsoDate('2026-07-20'),
      installments: 4,
      secondAdvanceDate: parseIsoDate('2026-11-30'),
    });
    const fourth = forms[3];
    expect(toIsoDate(fourth.paymentDate)).toBe('2026-10-16');
    const rows = fourth.lines.map((l) => [l.section, l.code, l.installmentCode ?? '', l.officeCode ?? '', l.positionCode ?? '', l.periodFrom ?? '', l.periodTo ?? '', l.debitAmount]);
    expect(rows).toEqual(expect.arrayContaining([
      ['TREASURY', '1792', '0404', '', '', '', '', 633.5],
      ['TREASURY', '1790', '0404', '', '', '', '', 704.88],
      ['TREASURY', '1668', '', '', '', '', '', 6.02],
      ['TREASURY', '1668', '', '', '', '', '', 6.7],
      ['INPS', 'APR', '', '5500', CODE_2025, '01/2025', '12/2025', 706.5],
      ['INPS', 'API', '', '5500', CODE_2025, '01/2025', '12/2025', 6.71],
      ['INPS', 'APR', '', '5500', CODE_2026, '01/2026', '12/2026', 716.64],
      ['INPS', 'API', '', '5500', CODE_2026, '01/2026', '12/2026', 6.81],
    ]));
    expect(fourth.lines).toHaveLength(8);
    // Second advance in November: AP with the 2026 code, as on the real form.
    const november = forms[4].lines.find((l) => l.section === 'INPS');
    expect([november?.code, november?.positionCode, november?.debitAmount]).toEqual(['AP', CODE_2026, 2_866.56]);
  });

  it('lists the four fixed installments (AF) and balance and advances above the minimum', () => {
    const inps = buildDeadlines(ruleSet2026, { contributionScheme: 'INPS_ARTISANS', applyExtension: true }).filter((d) => d.kind.startsWith('INPS_'));
    expect(inps.map((d) => [d.kind, d.date, d.code])).toEqual([
      ['INPS_FIXED_INSTALLMENT', '2026-05-18', 'AF'],
      ['INPS_BALANCE', '2026-07-20', 'AP'],
      ['INPS_FIRST_ADVANCE', '2026-07-20', 'AP'],
      ['INPS_FIXED_INSTALLMENT', '2026-08-20', 'AF'],
      ['INPS_FIXED_INSTALLMENT', '2026-11-16', 'AF'],
      ['INPS_SECOND_ADVANCE', '2026-11-30', 'AP'],
      ['INPS_FIXED_INSTALLMENT', '2027-02-16', 'AF'],
    ]);
  });
});
