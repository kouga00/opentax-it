import { describe, expect, it } from 'vitest';
import { paymentSchedule, termsLabel } from './payment-schedule.js';

describe('paymentSchedule', () => {
  it('counts the days from the invoice date', () => {
    expect(paymentSchedule('2026-09-23', 2802, { dueDays: [10], fromMonthEnd: false })).toEqual([{ dueDate: '2026-10-03', amount: 2802 }]);
  });

  it('moves each due date to the end of its month with "fine mese", as the software in use ("30 gg f.m." on 30/09 → 31/10)', () => {
    expect(paymentSchedule('2026-09-30', 100, { dueDays: [30], fromMonthEnd: true })).toEqual([{ dueDate: '2026-10-31', amount: 100 }]);
    expect(paymentSchedule('2026-09-23', 100, { dueDays: [30], fromMonthEnd: true })[0].dueDate).toBe('2026-10-31');
    expect(paymentSchedule('2026-02-10', 100, { dueDays: [0], fromMonthEnd: true })[0].dueDate).toBe('2026-02-28');
  });

  it('splits the total in equal installments in whole cents, the remainder on the last one', () => {
    const s = paymentSchedule('2026-09-30', 1000, { dueDays: [30, 60, 90], fromMonthEnd: true });
    expect(s.map((i) => i.dueDate)).toEqual(['2026-10-31', '2026-11-30', '2026-12-31']);
    expect(s.map((i) => i.amount)).toEqual([333.33, 333.33, 333.34]);
  });

  it('is due at sight without days', () => {
    expect(paymentSchedule('2026-09-30', 50, { dueDays: [], fromMonthEnd: false })).toEqual([{ dueDate: '2026-09-30', amount: 50 }]);
  });

  it('labels the terms as in the profiles', () => {
    expect(termsLabel({ dueDays: [30, 60, 90], fromMonthEnd: true })).toBe('30/60/90 gg fine mese');
    expect(termsLabel({ dueDays: [10], fromMonthEnd: false })).toBe('10 gg data fattura');
    expect(termsLabel({ dueDays: [0], fromMonthEnd: false })).toBe('a vista');
  });
});
