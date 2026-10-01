import { describe, expect, it } from 'vitest';
import { businessDaysBefore, easterSunday, italianPublicHolidays, nextBusinessDay, parseIsoDate, toIsoDate } from './calendar';

describe('calendar', () => {
  it('Easter 2026 = 5 April, 2027 = 28 March', () => {
    expect(toIsoDate(easterSunday(2026))).toBe('2026-04-05');
    expect(toIsoDate(easterSunday(2027))).toBe('2027-03-28');
  });

  it('4 October is a national holiday from 2026 (L. 151/2025), not before', () => {
    expect(italianPublicHolidays(2026).has('2026-10-04')).toBe(true);
    expect(italianPublicHolidays(2025).has('2025-10-04')).toBe(false);
    // 4/10/2027 is a Monday: a deadline on that day moves to Tuesday 5/10.
    expect(toIsoDate(nextBusinessDay(parseIsoDate('2027-10-04')))).toBe('2027-10-05');
  });

  it('31/10/2026 (Saturday) → 2/11/2026, as in the Redditi PF 2026 instructions', () => {
    expect(toIsoDate(nextBusinessDay(parseIsoDate('2026-10-31')))).toBe('2026-11-02');
  });

  it('31/5/2026 (Sunday) → 1/6/2026 (Monday, not a holiday)', () => {
    expect(toIsoDate(nextBusinessDay(parseIsoDate('2026-05-31')))).toBe('2026-06-01');
  });

  it('weekday holiday: 2/6/2027 (Republic Day) → 3/6/2027', () => {
    expect(toIsoDate(nextBusinessDay(parseIsoDate('2027-06-02')))).toBe('2027-06-03');
  });

  it('third-to-last business day before 16/12/2026 (Wednesday) = 11/12/2026', () => {
    expect(toIsoDate(businessDaysBefore(parseIsoDate('2026-12-16'), 3))).toBe('2026-12-11');
  });
});
