import { describe, expect, it } from 'vitest';
import { buildDeadlines } from './deadlines';
import { ruleSet2026 } from './rule-sets/2026';

describe('deadlines 2026', () => {
  it('with the flat-rate extension: balance/advances on 20 July, second advance 30 November, filing 2 November', () => {
    const all = buildDeadlines(ruleSet2026, { applyExtension: true });
    const byKind = Object.fromEntries(all.map((x) => [x.kind, x]));
    expect(byKind.TAX_BALANCE.date).toBe('2026-07-20');
    expect(byKind.INPS_FIRST_ADVANCE.date).toBe('2026-07-20');
    expect(byKind.TAX_SECOND_ADVANCE.date).toBe('2026-11-30');
    expect(byKind.TAX_RETURN.date).toBe('2026-11-02');
    expect(byKind.TAX_BALANCE.code).toBe('1792');
    expect(byKind.TAX_SECOND_ADVANCE.code).toBe('1791');
    expect(byKind.INPS_BALANCE.code).toBe('PXX');
  });

  it('lists no INPS deadline when the scheme is not computed (professional fund)', () => {
    const kinds = buildDeadlines(ruleSet2026, { contributionScheme: 'PROFESSIONAL_FUND' }).map((x) => x.kind);
    expect(kinds).toContain('TAX_BALANCE');
    expect(kinds.filter((k) => k.startsWith('INPS_'))).toEqual([]);
  });

  it('without the extension: 30 June', () => {
    expect(buildDeadlines(ruleSet2026).find((x) => x.kind === 'TAX_BALANCE')?.date).toBe('2026-06-30');
  });

  it('stamp duty: 4 deadlines; Q1 (31/5 Sunday) moves to 1/6, Q4 to 1/3/2027 (28/2 Sunday)', () => {
    const s = buildDeadlines(ruleSet2026).filter((x) => x.kind === 'STAMP_DUTY');
    expect(s.map((x) => x.date)).toEqual(['2026-06-01', '2026-09-30', '2026-11-30', '2027-03-01']);
    expect(s.map((x) => x.code)).toEqual(['2521', '2522', '2523', '2524']);
  });

  it('stamp duty deferrals (AdE guide notes * and **): small amounts move Q1 and Q2 to the Q3 date', () => {
    const s = buildDeadlines(ruleSet2026, { stampDutyByQuarter: { 1: 6, 2: 4, 3: 2 } }).filter((x) => x.kind === 'STAMP_DUTY');
    expect(s.map((x) => [x.details.quarter, x.date, x.details.deferredFrom ?? null, x.details.amount])).toEqual([
      [1, '2026-11-30', '2026-05-31', 6],
      [2, '2026-11-30', '2026-09-30', 4],
      [3, '2026-11-30', null, 2],
      [4, '2027-03-01', null, 0],
    ]);
  });

  it('stamp duty: Q1 above the threshold is due at the ordinary date; Q1 ≤ threshold but Q1+Q2 above moves Q1 to the Q2 date', () => {
    const big = buildDeadlines(ruleSet2026, { stampDutyByQuarter: { 1: 6000, 2: 10 } }).filter((x) => x.kind === 'STAMP_DUTY');
    expect(big[0].date).toBe('2026-06-01');
    expect(big[1].date).toBe('2026-09-30');
    const mid = buildDeadlines(ruleSet2026, { stampDutyByQuarter: { 1: 3000, 2: 3000 } }).filter((x) => x.kind === 'STAMP_DUTY');
    expect(mid[0].date).toBe('2026-09-30');
    expect(mid[0].details.deferredFrom).toBe('2026-05-31');
    expect(mid[1].date).toBe('2026-09-30');
  });

  it('stamp duty list B: last day to change it, not moved to a business day, only for quarters with stamps', () => {
    const all = buildDeadlines(ruleSet2026, { stampDutyByQuarter: { 2: 4, 3: 2 } });
    expect(all.filter((x) => x.kind === 'STAMP_DUTY_LIST_B').map((x) => [x.details.quarter, x.date])).toEqual([[2, '2026-09-10'], [3, '2026-10-31']]);
    expect(all.find((x) => x.kind === 'STAMP_DUTY' && x.details.quarter === 3)?.details.amountAvailableOn).toBe('2026-11-15');
    // Without the amounts (no tenant) every quarter has the reminder.
    expect(buildDeadlines(ruleSet2026).filter((x) => x.kind === 'STAMP_DUTY_LIST_B')).toHaveLength(4);
  });

  it('quarterly Intrastat: 25 April 2026 is a holiday and a Saturday → 27 April', () => {
    const i = buildDeadlines(ruleSet2026, { quarterlyIntrastat: true }).filter((x) => x.kind === 'INTRASTAT');
    expect(i.map((x) => x.date)).toEqual(['2026-04-27', '2026-07-27', '2026-10-26', '2027-01-25']);
  });

  it('is sorted by date', () => {
    const all = buildDeadlines(ruleSet2026, { applyExtension: true, quarterlyIntrastat: true });
    const dates = all.map((x) => x.date);
    expect([...dates].sort()).toEqual(dates);
  });
});
