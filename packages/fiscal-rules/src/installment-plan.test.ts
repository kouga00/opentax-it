import { describe, expect, it } from 'vitest';
import { buildInstallmentPlan, commercialDays, maxInstallmentDates, maxInstallments, secondInstallmentInterestPct } from './installment-plan';

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);

describe('installment plan – official table, Redditi PF 2026 instructions, booklet 1, "Rateazione"', () => {
  it('first installment 30 June: 7 installments, interest 0 / 0.18 / 0.51 / 0.84 / 1.17 / 1.50 / 1.83', () => {
    const plan = buildInstallmentPlan({ amount: 7000, firstDueDate: d('2026-06-30') });
    expect(plan.map((r) => iso(r.dueDate))).toEqual([
      '2026-06-30', '2026-07-16', '2026-08-20', '2026-09-16', '2026-10-16', '2026-11-16', '2026-12-16',
    ]);
    expect(plan.map((r) => r.interestPct)).toEqual([0, 0.18, 0.51, 0.84, 1.17, 1.5, 1.83]);
  });

  it('first installment 30 July (deferral +0.40%): 6 installments, second on 20 August with 0.18', () => {
    const plan = buildInstallmentPlan({ amount: 6000, firstDueDate: d('2026-07-30') });
    expect(plan.map((r) => iso(r.dueDate))).toEqual([
      '2026-07-30', '2026-08-20', '2026-09-16', '2026-10-16', '2026-11-16', '2026-12-16',
    ]);
    expect(plan.map((r) => r.interestPct)).toEqual([0, 0.18, 0.51, 0.84, 1.17, 1.5]);
  });
});

describe('installment plan – 2026 flat-rate extension (DL 89/2026 art. 6)', () => {
  it('first installment 20 July 2026: 6 installments', () => {
    expect(maxInstallments(d('2026-07-20'))).toBe(6);
    expect(maxInstallmentDates(d('2026-07-20')).map(iso)).toEqual([
      '2026-07-20', '2026-08-20', '2026-09-16', '2026-10-16', '2026-11-16', '2026-12-16',
    ]);
  });

  it('first installment 19 August 2026 (+0.80%): 5 installments', () => {
    expect(maxInstallments(d('2026-08-20'))).toBe(5);
  });

  it('commercial method (instructions text): 30/6→16/7 = 16 days, 30/7→16/8 = 16 days, 20/7→16/8 = 26 days', () => {
    expect(commercialDays(d('2026-06-30'), d('2026-07-16'))).toBe(16);
    expect(commercialDays(d('2026-07-30'), d('2026-08-16'))).toBe(16);
    expect(commercialDays(d('2026-07-20'), d('2026-08-16'))).toBe(26);
    expect(secondInstallmentInterestPct(d('2026-07-20'), d('2026-08-16'), 4)).toBe(0.29);
  });

  it('first installment 20 July 2026: 0 / 0.29 / 0.62 / 0.95 / 1.28 / 1.61', () => {
    const plan = buildInstallmentPlan({ amount: 6000, firstDueDate: d('2026-07-20') });
    expect(plan.map((r) => r.interestPct)).toEqual([0, 0.29, 0.62, 0.95, 1.28, 1.61]);
  });

  it('matches real 2026 F24 forms (5 installments from 20 July): interest of installments 3 and 4', () => {
    // Amounts per installment as printed on the F24 (rata 3: 4,05 / 8,09 / 7,91 / 5,63; rata 4: 6,20 / 12,40 / 12,12 / 8,62).
    const cases: Array<[number, number, number]> = [
      [652.7, 4.05, 6.2],
      [1305.4, 8.09, 12.4],
      [1275.9, 7.91, 12.12],
      [907.44, 5.63, 8.62],
    ];
    for (const [principal, third, fourth] of cases) {
      const plan = buildInstallmentPlan({ amount: principal * 5, firstDueDate: d('2026-07-20'), installments: 5 });
      expect(plan[2].interest).toBe(third);
      expect(plan[3].interest).toBe(fourth);
    }
  });
});

describe('installment plan – amounts', () => {
  it('equal principals, the last absorbs rounding, interest kept separate', () => {
    const plan = buildInstallmentPlan({ amount: 1000, firstDueDate: d('2026-06-30'), installments: 3 });
    expect(plan.map((r) => r.principal)).toEqual([333.33, 333.33, 333.34]);
    expect(plan[1].interest).toBe(0.6); // 333.33 × 0.18%
    expect(plan[2].interest).toBe(1.7); // 333.34 × 0.51%
    expect(plan.reduce((s, r) => s + r.principal, 0)).toBeCloseTo(1000, 2);
  });

  it('rejects more installments than allowed', () => {
    expect(() => buildInstallmentPlan({ amount: 100, firstDueDate: d('2026-07-20'), installments: 7 })).toThrow();
  });
});
