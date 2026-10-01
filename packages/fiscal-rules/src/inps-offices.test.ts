import { describe, expect, it } from 'vitest';
import { findInpsOffice, findInpsOfficeById, findInpsOffices, INPS_OFFICES, isValidInpsOfficeForGestioneSeparata, isValidInpsOfficeIdForGestioneSeparata } from './inps-offices';

describe('INPS office codes (AdE table)', () => {
  it('contains the full table with zero-padded 4-digit codes', () => {
    expect(INPS_OFFICES.length).toBeGreaterThan(200);
    expect(INPS_OFFICES.every((o) => /^\d{4}$/.test(o.code))).toBe(true);
    expect(findInpsOffice('100')?.name).toBe('Agrigento');
  });

  it('5500 is Palermo and accepts other contributions', () => {
    expect(findInpsOffice('5500')?.name).toBe('Palermo');
    expect(isValidInpsOfficeForGestioneSeparata('5500')).toBe(true);
  });

  it('keeps the duplicated code 8103 exactly as published by AdE, with unique ids', () => {
    expect(findInpsOffices('8103').map((o) => o.name)).toEqual(['Torino Nord', 'Torino Sud']);
    expect(findInpsOffices('8103').map((o) => o.id)).toEqual(['8103-torino-nord', '8103-torino-sud']);
    expect(new Set(INPS_OFFICES.map((o) => o.id)).size).toBe(INPS_OFFICES.length);
    expect(findInpsOfficeById('5500-palermo')?.code).toBe('5500');
    expect(isValidInpsOfficeIdForGestioneSeparata('5500-palermo')).toBe(true);
    expect(isValidInpsOfficeIdForGestioneSeparata('9999-nowhere')).toBe(false);
  });

  it('offices flagged NO for other contributions are rejected', () => {
    const noOther = INPS_OFFICES.find((o) => !o.otherContributions);
    expect(noOther).toBeDefined();
    expect(isValidInpsOfficeForGestioneSeparata(noOther!.code)).toBe(false);
    expect(isValidInpsOfficeForGestioneSeparata('0000')).toBe(false);
  });
});
