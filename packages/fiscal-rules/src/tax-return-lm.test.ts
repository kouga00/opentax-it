import { describe, expect, it } from 'vitest';
import { lmReturnRows, type LmReturnInput } from './tax-return-lm';
import { computeSubstituteTax } from './substitute-tax';
import { ruleSet2025 } from './rule-sets/2025';

// Invented taxpayer: 30,000 € collected, ATECO 62.02.00 (coefficient 67%), 5,000 € of contributions paid.
const tax = computeSubstituteTax(ruleSet2025, { year: 2025, collectedRevenue: 30000.4, atecoCode: '62.02.00', activityStartYear: 2015, reducedRateEligible: false, contributionsPaid: 5000, taxCredits: 0 });
const input: LmReturnInput = { scheme: 'INPS_SEPARATE', atecoCode: '62.02.00', collectedRevenue: 30000.4, tax, contributionsPaid: 5000, taxCredits: 0, taxAdvancesPaid: 1500, reducedRate: false };
const byId = (rows: ReturnType<typeof lmReturnRows>) => Object.fromEntries(rows.map((r) => [r.id, r]));

describe('lmReturnRows (Redditi PF 2026, booklet 3, LM sections III and IV)', () => {
  it('fills LM22, LM34 col. 2 for the Gestione Separata, LM35 and the result rows in whole euro', () => {
    const r = byId(lmReturnRows(input));
    expect(r['LM22.1'].value).toBe('62.02.00');
    expect(r['LM22.2'].value).toBe(67);
    expect(r['LM22.3']).toMatchObject({ value: 30000, action: 'CHECK' });
    expect(r['LM22.5'].value).toBe(20100);
    expect(r['LM22.6'].value).toBe('2');
    expect(r['LM34.2'].value).toBe(20100);
    expect(r['LM34.1']).toBeUndefined();
    expect(r['LM35.1']).toMatchObject({ value: 5000, action: 'ENTER' });
    expect(r['LM35.2'].value).toBe(5000);
    expect(r['LM36'].value).toBe(15100);
    expect(r['LM39'].value).toBe(2265);
    expect(r['LM42'].value).toBe(2265);
    expect(r['LM45.2'].value).toBe(1500);
    expect(r['LM46']).toMatchObject({ value: 765, action: 'RESULT' });
    expect(r['LM47']).toBeUndefined();
    expect(r['LM49']).toBeUndefined();
    expect(r['LM21.3']).toBeUndefined();
  });

  it('puts the business income of Artigiani and Commercianti in LM34 col. 1 with code 1 in LM22 col. 6', () => {
    const r = byId(lmReturnRows({ ...input, scheme: 'INPS_ARTISANS' }));
    expect(r['LM34.1'].value).toBe(20100);
    expect(r['LM34.2']).toBeUndefined();
    expect(r['LM22.6'].value).toBe('1');
    expect(r['LM21.type'].value).toBe('Impresa');
  });

  it('gives a credit in LM47 when the advances exceed the tax, and the excess contributions in LM49', () => {
    const small = computeSubstituteTax(ruleSet2025, { year: 2025, collectedRevenue: 10000, atecoCode: '62.02.00', activityStartYear: 2015, reducedRateEligible: false, contributionsPaid: 8000, taxCredits: 0 });
    const r = byId(lmReturnRows({ ...input, collectedRevenue: 10000, tax: small, contributionsPaid: 8000, taxAdvancesPaid: 500 }));
    expect(r['LM35.2'].value).toBe(6700);
    expect(r['LM49'].value).toBe(1300);
    expect(r['LM39'].value).toBe(0);
    expect(r['LM47'].value).toBe(500);
  });

  it('marks the 5% rate box and caps the credits at the tax (LM40 col. 41)', () => {
    const reduced = computeSubstituteTax(ruleSet2025, { year: 2025, collectedRevenue: 30000, atecoCode: '62.02.00', activityStartYear: 2024, reducedRateEligible: true, contributionsPaid: 5000, taxCredits: 0 });
    const r = byId(lmReturnRows({ ...input, tax: reduced, reducedRate: true, taxCredits: 5000, taxAdvancesPaid: 0 }));
    expect(r['LM21.3'].value).toBe('X');
    expect(r['LM39'].value).toBe(755);
    expect(r['LM40.41'].value).toBe(755);
    expect(r['LM42'].value).toBe(0);
    expect(r['LM46'].value).toBe(0);
  });

  it('takes the previous credit and its part used in F24 into the balance (LM42 − LM43 + LM44 − LM45)', () => {
    const r = byId(lmReturnRows({ ...input, previousCredit: { amount: 400, used: 150 } }));
    expect(r['LM43'].value).toBe(400);
    expect(r['LM44'].value).toBe(150);
    expect(r['LM46'].value).toBe(2265 - 400 + 150 - 1500);
  });
});
