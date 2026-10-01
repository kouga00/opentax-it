import { describe, expect, it } from 'vitest';
import { ruleSet2026 } from './rule-sets/2026';
import { reducedRateApplies, substituteTaxAdvance } from './substitute-tax';

describe('reducedRateApplies (par. 65: start year + 4)', () => {
  it('applies from the start year for five tax years, then stops', () => {
    expect(reducedRateApplies(ruleSet2026, 2024, 2024, true)).toBe(true);
    expect(reducedRateApplies(ruleSet2026, 2028, 2024, true)).toBe(true);
    expect(reducedRateApplies(ruleSet2026, 2029, 2024, true)).toBe(false);
    expect(reducedRateApplies(ruleSet2026, 2025, 2024, false)).toBe(false);
  });
});

describe('substituteTaxAdvance (Istr. RN62 via Circ. 10/E/2016 §4; DPR 435/2001 art. 17 par. 3)', () => {
  it('not due below 51.65', () => {
    expect(substituteTaxAdvance(ruleSet2026, 51).mode).toBe('NOT_DUE');
  });
  it('single instalment in November when the first would not exceed 103 (i.e. below 257.52 at 40%)', () => {
    expect(substituteTaxAdvance(ruleSet2026, 257)).toEqual({ total: 257, first: 0, second: 257, mode: 'SINGLE' });
    expect(substituteTaxAdvance(ruleSet2026, 258).mode).toBe('TWO_INSTALMENTS');
  });
  it('40% + 60% in the general case', () => {
    expect(substituteTaxAdvance(ruleSet2026, 1_475)).toEqual({ total: 1_475, first: 590, second: 885, mode: 'TWO_INSTALMENTS' });
  });
  it('50% + 50% for ISA subjects (DL 124/2019 art. 58; res. 93/E/2019): real 2026 form, tax 6,527 → 3,263.50', () => {
    expect(substituteTaxAdvance(ruleSet2026, 6_527, true)).toEqual({ total: 6_527, first: 3_263.5, second: 3_263.5, mode: 'TWO_INSTALMENTS' });
    expect(substituteTaxAdvance(ruleSet2026, 206, true).mode).toBe('SINGLE');
    expect(substituteTaxAdvance(ruleSet2026, 207, true).mode).toBe('TWO_INSTALMENTS');
  });
});
