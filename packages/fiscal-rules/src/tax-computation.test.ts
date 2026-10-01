import { describe, expect, it } from 'vitest';
import { ruleSet2026 } from './rule-sets/2026';
import { computeTaxes } from './tax-computation';

const base = { year: 2025, atecoCode: '62.02', activityStartYear: 2024, reducedRateEligible: true, inpsRatePct: 26.07 };

describe('computeTaxes (LM section III, RR section II)', () => {
  it('income = revenue × 67%, contributions deducted within capacity, 5% in the reduced-rate window', () => {
    const r = computeTaxes(ruleSet2026, { ...base, collectedRevenue: 50_000, contributionsPaid: 4_000 });
    expect(r.coefficientPct).toBe(67);
    expect(r.grossIncome).toBe(33_500); // LM34
    expect(r.contributionsDeducted).toBe(4_000); // LM35 col. 2
    expect(r.netIncome).toBe(29_500); // LM36
    expect(r.taxRatePct).toBe(5);
    expect(r.substituteTax).toBe(1_475); // LM39
    expect(r.inpsTaxableIncome).toBe(33_500); // RR5 col. 11: gross income
    expect(r.inpsContribution).toBe(8_733); // 33,500 × 26.07% = 8,733.45 → whole euros (RR5 col. 15)
  });

  it('contributions exceeding the income are deducted only up to the income (LM35 col. 2 ≤ LM34)', () => {
    const r = computeTaxes(ruleSet2026, { ...base, collectedRevenue: 3_000, contributionsPaid: 5_000 });
    expect(r.grossIncome).toBe(2_010);
    expect(r.contributionsDeducted).toBe(2_010);
    expect(r.netIncome).toBe(0);
    expect(r.substituteTax).toBe(0);
  });

  it('INPS base is capped at the yearly ceiling (122,295 in 2026)', () => {
    const r = computeTaxes(ruleSet2026, { ...base, collectedRevenue: 200_000, contributionsPaid: 0, reducedRateEligible: false });
    expect(r.inpsTaxableIncome).toBe(122_295);
    expect(r.taxRatePct).toBe(15);
  });

  it('computes no contributions for a scheme without computation, and deducts those paid by hand (LM35)', () => {
    const r = computeTaxes(ruleSet2026, { ...base, collectedRevenue: 50_000, contributionsPaid: 4_000, contributionScheme: 'PROFESSIONAL_FUND' });
    expect(r.contributionsComputed).toBe(false);
    expect(r.inpsContribution).toBe(0);
    expect(r.contributionsDeducted).toBe(4_000);
    expect(r.substituteTax).toBe(1_475);
  });
});

describe('rounding (Istr. Redditi PF 2026, "Modalità di arrotondamento")', () => {
  it('rounds every return row to the euro unit, half up', () => {
    const r = computeTaxes(ruleSet2026, { ...base, collectedRevenue: 12_345.67, contributionsPaid: 1_234.5 });
    expect(r.grossIncome).toBe(8_272); // 12,346 × 67% = 8,271.82
    expect(r.contributionsDeducted).toBe(1_235);
    expect(r.netIncome).toBe(7_037);
    expect(r.substituteTax).toBe(352); // 7,037 × 5% = 351.85
    // INPS base = LM34 (Circ. INPS 62/2026 §2.2), contribution RR5 col. 15 in whole euros.
    expect(r.inpsTaxableIncome).toBe(8_272);
    expect(r.inpsContribution).toBe(2_157); // 8,272 × 26.07% = 2,156.51
  });
});
