import { describe, expect, it } from 'vitest';
import { parseFiscalRuleSet, profitabilityCoefficient } from './rule-set';
import { ruleSet2025 } from './rule-sets/2025';
import { ruleSet2026 } from './rule-sets/2026';

describe('FiscalRuleSet 2026', () => {
  it('matches the schema', () => {
    expect(() => parseFiscalRuleSet(ruleSet2026)).not.toThrow();
  });

  it('has an official source for every main section', () => {
    for (const key of ['flatRate.revenueThreshold', 'advancePayment', 'installments', 'inps.fullRatePct', 'stampDuty', 'taxCodes', 'inpsReasons', 'eInvoice']) {
      expect(ruleSet2026.sourceRefs[key]?.url).toMatch(/^https:\/\/(www\.)?(agenziaentrate\.gov\.it|normattiva\.it|gazzettaufficiale\.it|inps\.it|adm\.gov\.it)/);
    }
  });

  it('ATECO coefficients: 62.02 → 67%, 46.1 → 62%, 46.21 → 40%, 47.81 → 40%, 47.82 → 54%, 69 → 78%', () => {
    expect(profitabilityCoefficient(ruleSet2026, '62.02')).toBe(67);
    expect(profitabilityCoefficient(ruleSet2026, '62.02.00')).toBe(67);
    expect(profitabilityCoefficient(ruleSet2026, '46.1')).toBe(62);
    expect(profitabilityCoefficient(ruleSet2026, '46.21')).toBe(40);
    expect(profitabilityCoefficient(ruleSet2026, '47.81')).toBe(40);
    expect(profitabilityCoefficient(ruleSet2026, '47.82')).toBe(54);
    expect(profitabilityCoefficient(ruleSet2026, '69.20.11')).toBe(78);
    expect(() => profitabilityCoefficient(ruleSet2026, '04')).toThrow();
  });
});

describe('FiscalRuleSet 2025', () => {
  it('matches the schema and carries the 2025 values (INPS circular 27/2025; DL 84/2025 art. 13)', () => {
    expect(() => parseFiscalRuleSet(ruleSet2025)).not.toThrow();
    expect(ruleSet2025.year).toBe(2025);
    expect(ruleSet2025.inps).toMatchObject({ fullRatePct: 26.07, reducedRatePct: 24, incomeCeiling: 120_607, incomeFloor: 18_555 });
    expect(ruleSet2025.deadlines.balanceAndFirstAdvanceExtended).toBe('2025-07-21');
    expect(ruleSet2025.deadlines.deferredExtended).toBe('2025-08-20');
    expect(ruleSet2025.deadlines.deferralSurchargeExtendedPct).toBe(0.4);
    expect(ruleSet2025.stampDuty.deadlines.map((d) => d.date)).toEqual(['2025-05-31', '2025-09-30', '2025-11-30', '2026-02-28']);
    for (const key of ['inps.fullRatePct', 'inps.incomeCeiling', 'deadlines.balanceAndFirstAdvanceExtended', 'deadlines.installmentsEnd', 'eInvoice.specVersion']) {
      expect(ruleSet2025.sourceRefs[key]?.verifiedOn).toBe('2026-09-21');
    }
  });
});
