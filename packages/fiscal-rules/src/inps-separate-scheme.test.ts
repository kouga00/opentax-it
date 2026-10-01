import { describe, expect, it } from 'vitest';
import { ruleSet2026 } from './rule-sets/2026';
import { inpsAdvance } from './inps-separate-scheme';

describe('inpsAdvance (L. 662/96 par. 212)', () => {
  it('80% of the contribution on this year income, in two equal instalments, at the next year rate', () => {
    expect(inpsAdvance(ruleSet2026, 33_500, 26.07)).toEqual({ total: 6_986.76, first: 3_493.38, second: 3_493.38, mode: 'TWO_INSTALMENTS' });
  });
  it('real 2026 form: contribution 11,342.99 → first advance 4,537.20', () => {
    const base = 11_342.99 / 0.2607;
    expect(inpsAdvance(ruleSet2026, base, 26.07).first).toBe(4_537.2);
  });
});
