import { describe, expect, it } from 'vitest';
import { isCorrection, replacementNote } from './invoice-correction.js';

describe('invoice correction (Circ. AdE 13/E/2018 §1.6)', () => {
  it('names number, date and IdentificativoSdI of the rejected invoice, within the 200 characters of a Causale', () => {
    const note = replacementNote({ number: '3/2026', date: new Date('2026-09-20T00:00:00Z') }, '123456');
    expect(note).toBe('Emessa in sostituzione della fattura n. 3/2026 del 20/09/2026, scartata dallo SDI (identificativo SdI 123456)');
    expect(note.length).toBeLessThanOrEqual(200);
    expect(replacementNote({ number: '3/2026', date: new Date('2026-09-20T00:00:00Z') }, null)).toBe('Emessa in sostituzione della fattura n. 3/2026 del 20/09/2026, scartata dallo SDI');
  });

  it('a correction is a numbered draft', () => {
    expect(isCorrection({ status: 'DRAFT', sequence: 3 })).toBe(true);
    expect(isCorrection({ status: 'DRAFT', sequence: null })).toBe(false);
    expect(isCorrection({ status: 'REJECTED', sequence: 3 })).toBe(false);
  });
});
