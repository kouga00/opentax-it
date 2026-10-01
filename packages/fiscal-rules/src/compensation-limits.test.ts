import { describe, expect, it } from 'vitest';
import { creditsAboveLimit, horizontalUses } from './compensation-limits';

describe('compensation limit of EUR 5,000 (res. AdE 110/E/2019)', () => {
  it('does not count a 1792 credit used against 1792/1790 debts (vertical) nor INPS credits', () => {
    const uses = horizontalUses(
      [
        { creditId: 'a', section: 'TREASURY', code: '1792', referenceYear: 2025, amount: 3000 },
        { creditId: 'b', section: 'INPS', code: 'PXX', referenceYear: 2025, amount: 2000 },
      ],
      [{ code: '1792', amount: 2500 }, { code: '1790', amount: 1000 }, { code: 'PXX', amount: 1500 }],
    );
    expect(uses).toEqual([]);
  });

  it('counts the part of a credit above the same-tax debts, and credits of other taxes in full', () => {
    const uses = horizontalUses(
      [
        { creditId: 'a', section: 'TREASURY', code: '1792', referenceYear: 2025, amount: 3000 },
        { creditId: 'c', section: 'TREASURY', code: '4001', referenceYear: 2025, amount: 4000 },
      ],
      [{ code: '1792', amount: 1000 }, { code: 'PXX', amount: 6000 }],
    );
    expect(uses.map((u) => [u.code, u.amount])).toEqual([['1792', 2000], ['4001', 4000]]);
  });

  it('flags a credit above 5,000 in the year, adding the earlier forms (same code and reference year)', () => {
    const current = [{ creditId: 'c', section: 'TREASURY' as const, code: '4001', referenceYear: 2025, amount: 3000 }];
    expect(creditsAboveLimit(current, [])).toEqual([]);
    expect(creditsAboveLimit(current, [{ creditId: 'c', section: 'TREASURY', code: '4001', referenceYear: 2025, amount: 2500 }])).toEqual([{ code: '4001', referenceYear: 2025, total: 5500 }]);
    // Another reference year is another credit.
    expect(creditsAboveLimit(current, [{ creditId: 'd', section: 'TREASURY', code: '4001', referenceYear: 2024, amount: 4000 }])).toEqual([]);
  });
});
