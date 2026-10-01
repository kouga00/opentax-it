import { describe, expect, it } from 'vitest';
import { revenueShare } from './revenue.js';

describe('revenueShare', () => {
  it('counts the whole collection when the invoice has no professional fund contribution', () => {
    expect(revenueShare(1042, { total: 1042, professionalFundContribution: 0 })).toBe(1042);
  });

  it('leaves out the professional fund contribution, in proportion for a partial collection', () => {
    // 1,000 compensation + 40 contribution (4%) + 2 stamp duty
    expect(revenueShare(1042, { total: 1042, professionalFundContribution: 40 })).toBe(1002);
    expect(revenueShare(521, { total: 1042, professionalFundContribution: 40 })).toBe(501);
  });
});
