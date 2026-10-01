import { describe, expect, it } from 'vitest';
import { buildF24TelematicFile, type F24FileLine, type F24FileTaxpayer } from './f24-telematic-file';

// Invented taxpayer and INPS code: positions and lengths come from ade-f24-spec-contribuenti-2015 (Allegato 1).
const taxpayer: F24FileTaxpayer = {
  fiscalCode: 'RSSMRA80A01H501U',
  lastName: 'Rossi',
  firstName: 'Mario',
  sex: 'M',
  birthDate: new Date('1980-01-01T00:00:00Z'),
  birthPlace: 'Roma',
  birthProvince: 'RM',
  iban: 'IT60 X054 2811 1010 0000 0123 456',
};
const debitDate = new Date('2026-11-16T00:00:00Z');
const treasury = (code: string, amount: number, installmentCode?: string, creditAmount = 0): F24FileLine => ({ section: 'TREASURY', code, installmentCode, referenceYear: 2025, debitAmount: amount, creditAmount });
const inps = (code: string, amount: number): F24FileLine => ({ section: 'INPS', code, officeCode: '5100', positionCode: '12345678901234567', periodFrom: '01/2026', periodTo: '12/2026', referenceYear: 2026, debitAmount: amount, creditAmount: 0 });

/** Field at a 1-based position, as the specification lists it. */
const field = (record: string, position: number, length: number) => record.slice(position - 1, position - 1 + length);
const records = (file: string) => file.split('\r\n').slice(0, -1);

describe('buildF24TelematicFile (Allegato 1, 9 March 2015)', () => {
  const file = buildF24TelematicFile(taxpayer, debitDate, [
    { lines: [treasury('1790', 1200.5, '0101'), treasury('1668', 12.34, '0206'), inps('AP', 1500)] },
    { lines: [treasury('1792', 300)] },
  ]);
  const [a, m, v1, v2, z] = records(file);

  it('writes records A, M, one V per form and Z, of 1,900 characters ending with "A" and CR LF', () => {
    expect(records(file).map((r) => r[0])).toEqual(['A', 'M', 'V', 'V', 'Z']);
    for (const r of records(file)) {
      expect(r).toHaveLength(1898); // plus CR LF: 1,900
      expect(r.at(-1)).toBe('A');
    }
    expect(file.endsWith('A\r\n')).toBe(true);
  });

  it('identifies the taxpayer as supplier of the file (record A)', () => {
    expect(field(a, 16, 5)).toBe('F24A0');
    expect(field(a, 21, 2)).toBe('04');
    expect(field(a, 23, 16)).toBe('RSSMRA80A01H501U');
    expect(field(a, 39, 24)).toBe('ROSSI'.padEnd(24));
    expect(field(a, 84, 8)).toBe('01011980');
    expect(field(a, 522, 6)).toBe('001001');
  });

  it('puts the total, the debit date and the IBAN in record M', () => {
    expect(field(m, 18, 8)).toBe('00000001');
    expect(field(m, 91, 1)).toBe('E');
    expect(field(m, 1741, 27)).toBe('IT60X0542811101000000123456');
    expect(field(m, 1869, 4)).toBe('EURO');
    expect(field(m, 1873, 15)).toBe('3.012,84'.padEnd(15));
    expect(field(m, 1888, 10)).toBe('16-11-2026');
  });

  it('writes the Treasury rows in cents with their installment and year', () => {
    expect(field(v1, 90, 1)).toBe('A');
    expect(field(v1, 105, 4)).toBe('1790');
    expect(field(v1, 125, 4)).toBe('0101');
    expect(field(v1, 129, 4)).toBe('2025');
    expect(field(v1, 133, 15)).toBe('000000000120050');
    expect(field(v1, 163, 4)).toBe('1668');
    expect(field(v1, 191, 15)).toBe('000000000001234');
    // Unused rows: blank codes, year 0000, amounts at zero.
    expect(field(v1, 221, 4)).toBe('    ');
    expect(field(v1, 245, 4)).toBe('0000');
    // Section totals: debit, credit, sign, balance.
    expect(field(v1, 453, 46)).toBe('000000000121284' + '000000000000000' + 'P' + '000000000121284');
  });

  it('writes the INPS rows with office, reason, INPS code and period MMAAAA', () => {
    expect(field(v1, 499, 4)).toBe('5100');
    expect(field(v1, 503, 4)).toBe('AP  ');
    expect(field(v1, 507, 17)).toBe('12345678901234567');
    expect(field(v1, 524, 12)).toBe('012026122026');
    expect(field(v1, 536, 15)).toBe('000000000150000');
    expect(field(v1, 797, 1)).toBe('P');
  });

  it('leaves the unused sections blank and closes each form with its balance and date', () => {
    expect(field(v1, 1019, 1)).toBe(' ');
    expect(field(v1, 1573, 4)).toBe('0000');
    expect(field(v1, 1793, 15)).toBe('000000000271284');
    expect(field(v1, 1808, 8)).toBe('16112026');
    expect(field(v2, 1793, 15)).toBe('000000000030000');
    expect(field(v2, 499, 4)).toBe('0000');
    expect(field(v2, 797, 1)).toBe(' ');
  });

  it('counts the forms in record Z', () => {
    expect(field(z, 16, 9)).toBe('000000002');
    expect(field(z, 25, 9)).toBe('000000001');
  });

  it('writes a zero-balance form without IBAN and with 0,00', () => {
    const zero = records(buildF24TelematicFile(taxpayer, debitDate, [{ lines: [treasury('1792', 300), treasury('4001', 0, undefined, 300)] }]));
    expect(field(zero[1], 1741, 27).trim()).toBe('');
    expect(field(zero[1], 1873, 15)).toBe('0,00'.padEnd(15));
    expect(field(zero[2], 125, 4)).toBe('0000');
  });

  it('refuses sections it does not write yet, a negative balance and missing INPS office codes', () => {
    expect(() => buildF24TelematicFile(taxpayer, debitDate, [{ lines: [{ ...treasury('E102', 10), section: 'OTHER_ENTITY' }] }])).toThrow('Altri enti previdenziali');
    expect(() => buildF24TelematicFile(taxpayer, debitDate, [{ lines: [treasury('4001', 0, undefined, 50)] }])).toThrow('saldo finale è negativo');
    expect(() => buildF24TelematicFile(taxpayer, debitDate, [{ lines: [{ ...inps('AP', 10), officeCode: undefined }] }])).toThrow('codice sede INPS');
    expect(() => buildF24TelematicFile(taxpayer, debitDate, [])).toThrow('Nessun F24');
  });

  it('writes the credits of the return in the regional and local sections, with their codes', () => {
    const [, m, v] = records(buildF24TelematicFile(taxpayer, debitDate, [{ lines: [
      treasury('1790', 500, '0101'),
      { section: 'REGIONAL', code: '3801', localCode: '05', installmentCode: '0101', referenceYear: 2025, debitAmount: 0, creditAmount: 40 },
      { section: 'LOCAL', code: '3844', localCode: 'G273', installmentCode: '0101', referenceYear: 2025, debitAmount: 0, creditAmount: 109 },
    ] }]));
    expect(field(v, 813, 44)).toBe('05' + '3801' + '0101' + '2025' + '0'.repeat(15) + '000000000004000');
    expect(field(v, 1019, 1)).toBe('N');
    expect(field(v, 1053, 4)).toBe('G273');
    expect(field(v, 1057, 22)).toBe('0'.repeat(22));
    expect(field(v, 1079, 12)).toBe('3844' + '0101' + '2025');
    expect(field(v, 1355, 1)).toBe('N');
    expect(field(v, 1793, 15)).toBe('000000000035100');
    expect(field(m, 1873, 15)).toBe('351,00'.padEnd(15));
  });

  it('writes names in capitals without accents, so that every character takes one position', () => {
    const file = buildF24TelematicFile({ ...taxpayer, lastName: 'Niccolò', birthPlace: 'Forlì' }, debitDate, [{ lines: [treasury('1792', 1)] }]);
    expect(field(records(file)[0], 39, 7)).toBe('NICCOLO');
    expect(field(records(file)[1], 491, 5)).toBe('FORLI');
  });
});
