import { describe, expect, it } from 'vitest';
import { ruleSet2026 } from './rule-sets/2026';
import { stampDutyF24Line } from './stamp-duty';

describe('stampDutyF24Line (AdE resolution 42/E/2019)', () => {
  it('uses the code of the quarter in the Treasury section, with the year of the quarter', () => {
    expect(stampDutyF24Line(ruleSet2026, 3, 18)).toEqual({ section: 'TREASURY', code: '2523', referenceYear: 2026, debitAmount: 18 });
    // The fourth quarter is paid in February of the next year and still refers to 2026.
    expect(stampDutyF24Line(ruleSet2026, 4, 4).referenceYear).toBe(2026);
  });

  it('refuses an empty amount and a missing quarter', () => {
    expect(() => stampDutyF24Line(ruleSet2026, 1, 0)).toThrow('maggiore di zero');
    expect(() => stampDutyF24Line(ruleSet2026, 5, 2)).toThrow('5° trimestre');
  });
});
