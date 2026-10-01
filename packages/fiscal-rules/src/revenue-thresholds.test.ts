import { describe, expect, it } from 'vitest';
import { ruleSet2026 } from './rule-sets/2026';
import { thresholdOutlook, thresholdStatus } from './revenue-thresholds';

describe('thresholdStatus (par. 54 / par. 71)', () => {
  it('flags 85,000 and 100,000', () => {
    expect(thresholdStatus(ruleSet2026, 84_000)).toMatchObject({ exceedsAccessThreshold: false, exceedsExitThreshold: false });
    expect(thresholdStatus(ruleSet2026, 90_000)).toMatchObject({ exceedsAccessThreshold: true, exceedsExitThreshold: false });
    expect(thresholdStatus(ruleSet2026, 100_000.01)).toMatchObject({ exceedsExitThreshold: true });
  });
});

describe('thresholdOutlook', () => {
  it('marks a threshold as near from 80% and over above it, on the collected revenue', () => {
    expect(thresholdOutlook(ruleSet2026, { collectedRevenue: 67_999, outstanding: 0 }).accessLevel).toBe('OK');
    expect(thresholdOutlook(ruleSet2026, { collectedRevenue: 68_000, outstanding: 0 }).accessLevel).toBe('NEAR');
    const o = thresholdOutlook(ruleSet2026, { collectedRevenue: 85_000.01, outstanding: 0 });
    expect(o.accessLevel).toBe('OVER');
    expect(o.exitLevel).toBe('NEAR');
  });

  it('projects collected + outstanding + the invoice being issued against 100,000 and the personal limit', () => {
    const o = thresholdOutlook(ruleSet2026, { collectedRevenue: 80_000, outstanding: 15_000, invoiceTotal: 6_000, personalLimit: 84_000 });
    expect(o.projected).toBe(101_000);
    expect(o.projectedOverExit).toBe(true);
    expect(o.projectedOverPersonalLimit).toBe(true);
    expect(o.exitLevel).toBe('NEAR'); // the collected revenue alone is still below 100,000
    const none = thresholdOutlook(ruleSet2026, { collectedRevenue: 10_000, outstanding: 0, invoiceTotal: 1_000 });
    expect(none.personalLimit).toBeNull();
    expect(none.projectedOverPersonalLimit).toBe(false);
  });
});
