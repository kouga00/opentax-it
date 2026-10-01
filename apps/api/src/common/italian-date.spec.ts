import { describe, expect, it } from 'vitest';
import { parseSdiDateTime, todayInItaly } from './italian-date.js';

describe('parseSdiDateTime', () => {
  it('keeps a value with a zone as it is', () => {
    expect(parseSdiDateTime('2013-06-06T12:00:00Z')?.toISOString()).toBe('2013-06-06T12:00:00.000Z');
    expect(parseSdiDateTime('2026-09-26T10:00:00+02:00')?.toISOString()).toBe('2026-09-26T08:00:00.000Z');
  });

  it('reads a value without zone as Italian time, in summer and in winter', () => {
    expect(parseSdiDateTime('2013-06-06T12:00:00')?.toISOString()).toBe('2013-06-06T10:00:00.000Z');
    expect(parseSdiDateTime('2026-01-15T12:00:00')?.toISOString()).toBe('2026-01-15T11:00:00.000Z');
  });

  it('refuses an invalid value', () => {
    expect(parseSdiDateTime('non è una data')).toBeUndefined();
  });
});

describe('todayInItaly', () => {
  it('uses the Italian calendar, not UTC', () => {
    expect(todayInItaly(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
  });
});
