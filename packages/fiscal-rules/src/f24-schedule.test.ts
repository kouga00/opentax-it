import { describe, expect, it } from 'vitest';
import { parseIsoDate, toIsoDate } from './calendar';
import { buildCompensation, buildPaymentSchedule, installmentCode } from './f24-schedule';
import { ruleSet2026 } from './rule-sets/2026';

const d = parseIsoDate;
const base = {
  taxYear: 2025,
  inpsOfficeCode: '5500',
  inpsReducedRate: false,
  secondAdvanceDate: d('2026-11-30'),
};

describe('buildPaymentSchedule – real 2026 forms (5 installments from 20 July, INPS office 5500)', () => {
  const { forms, warnings } = buildPaymentSchedule(ruleSet2026, {
    ...base,
    amounts: { taxBalance: 6527, taxFirstAdvance: 3263.5, taxSecondAdvance: 3263.5, inpsBalance: 6379.5, inpsFirstAdvance: 4537.2, inpsSecondAdvance: 4537.2 },
    firstDueDate: d('2026-07-20'),
    installments: 5,
  });

  it('produces five installment forms and the second advance', () => {
    expect(warnings).toEqual([]);
    expect(forms.map((f) => `${f.kind} ${toIsoDate(f.paymentDate)}`)).toEqual([
      'INSTALLMENT 2026-07-20',
      'INSTALLMENT 2026-08-20',
      'INSTALLMENT 2026-09-16',
      'INSTALLMENT 2026-10-16',
      'INSTALLMENT 2026-11-16',
      'SECOND_ADVANCE 2026-11-30',
    ]);
  });

  it('installment 2 of 5 (20/8) matches the F24 prepared by the intermediary line by line: interest 0.29%', () => {
    const f = forms[1];
    const rows = f.lines.map((l) => [l.section, l.code, l.installmentCode ?? '', l.officeCode ?? '', l.periodFrom ?? '', l.periodTo ?? '', l.referenceYear, l.debitAmount]);
    expect(rows).toEqual([
      ['TREASURY', '1792', '0205', '', '', '', 2025, 1305.4],
      ['TREASURY', '1790', '0205', '', '', '', 2026, 652.7],
      ['INPS', 'PXXR', '', '5500', '01/2025', '12/2025', 2025, 1275.9],
      ['INPS', 'PXXR', '', '5500', '01/2026', '12/2026', 2026, 907.44],
      ['TREASURY', '1668', '', '', '', '', 2025, 3.79],
      ['TREASURY', '1668', '', '', '', '', 2026, 1.89],
      ['INPS', 'DPPI', '', '5500', '01/2025', '12/2025', 2025, 3.7],
      ['INPS', 'DPPI', '', '5500', '01/2026', '12/2026', 2026, 2.63],
    ]);
    expect(f.totalDebit).toBe(4153.45); // 1,963.78 (Erario) + 2,189.67 (INPS)
  });

  it('installment 3 of 5 matches the F24 prepared by the intermediary line by line', () => {
    const f = forms[2];
    expect(f.installmentNumber).toBe(3);
    expect(f.installmentsTotal).toBe(5);
    const rows = f.lines.map((l) => [l.section, l.code, l.installmentCode ?? '', l.officeCode ?? '', l.periodFrom ?? '', l.periodTo ?? '', l.referenceYear, l.debitAmount]);
    expect(rows).toEqual([
      ['TREASURY', '1792', '0305', '', '', '', 2025, 1305.4],
      ['TREASURY', '1790', '0305', '', '', '', 2026, 652.7],
      ['INPS', 'PXXR', '', '5500', '01/2025', '12/2025', 2025, 1275.9],
      ['INPS', 'PXXR', '', '5500', '01/2026', '12/2026', 2026, 907.44],
      ['TREASURY', '1668', '', '', '', '', 2025, 8.09],
      ['TREASURY', '1668', '', '', '', '', 2026, 4.05],
      ['INPS', 'DPPI', '', '5500', '01/2025', '12/2025', 2025, 7.91],
      ['INPS', 'DPPI', '', '5500', '01/2026', '12/2026', 2026, 5.63],
    ]);
    expect(f.totalDebit).toBe(4167.12); // 1,970.24 (Erario) + 2,196.88 (INPS)
  });

  it('installment 4 of 5 matches the F24 prepared by the intermediary line by line: interest 0.95%', () => {
    const f = forms[3];
    const rows = f.lines.map((l) => [l.section, l.code, l.installmentCode ?? '', l.officeCode ?? '', l.periodFrom ?? '', l.periodTo ?? '', l.referenceYear, l.debitAmount]);
    expect(rows).toEqual([
      ['TREASURY', '1792', '0405', '', '', '', 2025, 1305.4],
      ['TREASURY', '1790', '0405', '', '', '', 2026, 652.7],
      ['INPS', 'PXXR', '', '5500', '01/2025', '12/2025', 2025, 1275.9],
      ['INPS', 'PXXR', '', '5500', '01/2026', '12/2026', 2026, 907.44],
      ['TREASURY', '1668', '', '', '', '', 2025, 12.4],
      ['TREASURY', '1668', '', '', '', '', 2026, 6.2],
      ['INPS', 'DPPI', '', '5500', '01/2025', '12/2025', 2025, 12.12],
      ['INPS', 'DPPI', '', '5500', '01/2026', '12/2026', 2026, 8.62],
    ]);
    expect(f.totalDebit).toBe(4180.78); // 1,976.70 (Erario) + 2,204.08 (INPS)
  });

  it('installment 5 of 5 matches the F24 prepared by the intermediary line by line: interest 1.28%', () => {
    const f = forms[4];
    const rows = f.lines.map((l) => [l.section, l.code, l.installmentCode ?? '', l.officeCode ?? '', l.periodFrom ?? '', l.periodTo ?? '', l.referenceYear, l.debitAmount]);
    expect(rows).toEqual([
      ['TREASURY', '1792', '0505', '', '', '', 2025, 1305.4],
      ['TREASURY', '1790', '0505', '', '', '', 2026, 652.7],
      ['INPS', 'PXXR', '', '5500', '01/2025', '12/2025', 2025, 1275.9],
      ['INPS', 'PXXR', '', '5500', '01/2026', '12/2026', 2026, 907.44],
      ['TREASURY', '1668', '', '', '', '', 2025, 16.71],
      ['TREASURY', '1668', '', '', '', '', 2026, 8.35],
      ['INPS', 'DPPI', '', '5500', '01/2025', '12/2025', 2025, 16.33],
      ['INPS', 'DPPI', '', '5500', '01/2026', '12/2026', 2026, 11.62],
    ]);
    expect(f.totalDebit).toBe(4194.45); // 1,983.16 (Erario) + 2,211.29 (INPS)
  });

  it('first installment matches the real first form (paid early on 29/6): no interest rows, total 4,141.44', () => {
    expect(forms[0].lines.map((l) => [l.code, l.installmentCode ?? '', l.referenceYear, l.debitAmount])).toEqual([
      ['1792', '0105', 2025, 1305.4],
      ['1790', '0105', 2026, 652.7],
      ['PXXR', '', 2025, 1275.9],
      ['PXXR', '', 2026, 907.44],
    ]);
    expect(forms[0].totalDebit).toBe(4141.44); // 1,958.10 (Erario) + 2,183.34 (INPS)
  });

  it('second advance: 1791 and PXX without installment code, reference year 2026', () => {
    const f = forms[5];
    expect(f.lines.map((l) => [l.code, l.installmentCode, l.referenceYear, l.periodFrom, l.debitAmount])).toEqual([
      ['1791', undefined, 2026, undefined, 3263.5],
      ['PXX', undefined, 2026, '01/2026', 4537.2],
    ]);
    expect(f.totalDebit).toBe(7800.7);
  });

  it('matches the installment summary prepared by the intermediary: totals, interest and grand total', () => {
    const installmentForms = forms.filter((f) => f.kind === 'INSTALLMENT');
    const interest = (f: (typeof forms)[number]) => f.lines.filter((l) => l.role === 'INTEREST').reduce((s, l) => s + l.debitAmount, 0);
    expect(installmentForms.map((f) => f.totalDebit)).toEqual([4141.44, 4153.45, 4167.12, 4180.78, 4194.45]);
    // 4,141.44 × 0.29% (4% × 26 commercial days from 20/7 to 16/8), then +0.33% per month.
    expect(installmentForms.map((f) => Math.round(interest(f) * 100) / 100)).toEqual([0, 12.01, 25.68, 39.34, 53.01]);
    expect(Math.round(installmentForms.reduce((s, f) => s + f.totalDebit, 0) * 100) / 100).toBe(20837.24);
  });
});

describe('buildPaymentSchedule – single payment', () => {
  it('uses 0101 for 1790/1792, PXX for INPS and no interest rows', () => {
    const { forms } = buildPaymentSchedule(ruleSet2026, {
      ...base,
      amounts: { taxBalance: 1000, taxFirstAdvance: 400, taxSecondAdvance: 600, inpsBalance: 0, inpsFirstAdvance: 500, inpsSecondAdvance: 500 },
      firstDueDate: d('2026-06-30'),
      installments: 1,
    });
    expect(forms).toHaveLength(2);
    expect(forms[0].kind).toBe('BALANCE');
    expect(forms[0].lines.map((l) => [l.code, l.installmentCode, l.debitAmount])).toEqual([
      ['1792', '0101', 1000],
      ['1790', '0101', 400],
      ['PXX', undefined, 500],
    ]);
    expect(forms[0].totalDebit).toBe(1900);
  });

  it('applies the 0.40% surcharge before splitting when the deferred date is used', () => {
    const { forms } = buildPaymentSchedule(ruleSet2026, {
      ...base,
      amounts: { taxBalance: 1000, taxFirstAdvance: 0, taxSecondAdvance: 0, inpsBalance: 0, inpsFirstAdvance: 0, inpsSecondAdvance: 0 },
      firstDueDate: d('2026-07-30'),
      surchargePct: 0.4,
      installments: 2,
    });
    expect(forms[0].lines[0].debitAmount).toBe(502);
    expect(forms[1].lines[0].debitAmount).toBe(502);
    // 2 of each 502 is the surcharge, excluded from the advances carried to LM45.
    expect(forms[0].lines[0].surchargeAmount).toBe(2);
    expect(forms[1].lines[0].surchargeAmount).toBe(2);
    expect(forms[1].lines[1]).toMatchObject({ code: '1668', debitAmount: 0.9 }); // 502 × 0.18%
  });

  it('INPS with deferral: the surcharge goes on DPPI with the interest, not on the contribution (Circ. INPS 62/2026)', () => {
    const { forms } = buildPaymentSchedule(ruleSet2026, {
      ...base,
      amounts: { taxBalance: 1000, taxFirstAdvance: 0, taxSecondAdvance: 0, inpsBalance: 1000, inpsFirstAdvance: 0, inpsSecondAdvance: 0 },
      firstDueDate: d('2026-07-30'),
      surchargePct: 0.4,
      installments: 2,
    });
    const rows = (i: number) => forms[i].lines.map((l) => [l.code, l.debitAmount]);
    // Treasury: 1000 × 1.004 = 1004 split in two, surcharge inside 1792 (Redditi PF booklet 1, §7).
    // INPS: contribution without surcharge (500 per installment); DPPI = surcharge share 2 (+ interest 0.90 on the 2nd).
    expect(rows(0)).toEqual([['1792', 502], ['PXXR', 500], ['DPPI', 2]]);
    expect(rows(1)).toEqual([['1792', 502], ['PXXR', 500], ['1668', 0.9], ['DPPI', 2.9]]);
    // Same total as before the change: only the split between PXXR and DPPI differs.
    expect(forms[0].totalDebit + forms[1].totalDebit).toBe(2 * 1004 + 2 * 0.9);
  });

  it('INPS single payment with deferral: DPPI carries only the surcharge', () => {
    const { forms } = buildPaymentSchedule(ruleSet2026, {
      ...base,
      amounts: { taxBalance: 0, taxFirstAdvance: 0, taxSecondAdvance: 0, inpsBalance: 1000, inpsFirstAdvance: 0, inpsSecondAdvance: 0 },
      firstDueDate: d('2026-07-30'),
      surchargePct: 0.4,
      installments: 1,
    });
    expect(forms[0].lines.map((l) => [l.code, l.debitAmount])).toEqual([['PXX', 1000], ['DPPI', 4]]);
  });

  it('warns about lines below the EUR 1.03 minimum and uses P10/P10R at the 24% rate', () => {
    const { forms, warnings } = buildPaymentSchedule(ruleSet2026, {
      ...base,
      inpsReducedRate: true,
      amounts: { taxBalance: 0, taxFirstAdvance: 0, taxSecondAdvance: 0, inpsBalance: 100, inpsFirstAdvance: 0, inpsSecondAdvance: 0 },
      firstDueDate: d('2026-06-30'),
      installments: 2,
    });
    expect(forms[1].lines.map((l) => l.code)).toEqual(['P10R', 'DPPI']);
    expect(warnings).toHaveLength(1);
  });

  it('installmentCode pads to NNRR', () => {
    expect(installmentCode(2, 6)).toBe('0206');
  });
});

describe('buildCompensation – real 2026 zero-balance form (IRPEF and municipal surtax credits against the INPS balance)', () => {
  const result = buildCompensation(ruleSet2026, {
    ...base,
    amounts: { taxBalance: 6527, taxFirstAdvance: 3263.5, taxSecondAdvance: 3263.5, inpsBalance: 11342.99, inpsFirstAdvance: 4537.2, inpsSecondAdvance: 4537.2 },
    date: d('2026-06-29'),
    order: 'INPS_FIRST',
    credits: [
      { id: 'irpef', section: 'TREASURY', code: '4001', referenceYear: 2025, amount: 4854.49, installmentCode: '0101' },
      { id: 'surtax', section: 'LOCAL', code: '3844', referenceYear: 2025, amount: 109, localCode: 'D567', installmentCode: '0101' },
    ],
  });

  it('covers the INPS balance with the credits and leaves the residual for the installments', () => {
    expect(result.form?.lines.map((l) => [l.section, l.code, l.installmentCode ?? '', l.localCode ?? '', l.periodFrom ?? '', l.referenceYear, l.debitAmount, l.creditAmount ?? 0])).toEqual([
      ['INPS', 'PXX', '', '', '01/2025', 2025, 4963.49, 0],
      ['TREASURY', '4001', '0101', '', '', 2025, 0, 4854.49],
      ['LOCAL', '3844', '0101', 'D567', '', 2025, 0, 109],
    ]);
    expect(result.form?.totalDebit).toBe(4963.49);
    expect(result.form?.totalCredit).toBe(4963.49);
    expect(result.amounts.inpsBalance).toBe(6379.5); // 1,275.90 × 5 on the real installments
    expect(result.amounts.taxBalance).toBe(6527);
    expect(result.usages).toEqual([{ creditId: 'irpef', amount: 4854.49 }, { creditId: 'surtax', amount: 109 }]);
    expect(result.unusedCredit).toBe(0);
  });

  it('with TAX_FIRST the substitute tax balance is covered first, with 0101', () => {
    const r = buildCompensation(ruleSet2026, {
      ...base,
      amounts: { taxBalance: 1000, taxFirstAdvance: 500, taxSecondAdvance: 500, inpsBalance: 2000, inpsFirstAdvance: 800, inpsSecondAdvance: 800 },
      date: d('2026-06-30'),
      order: 'TAX_FIRST',
      credits: [{ id: 'c', section: 'TREASURY', code: '1792', referenceYear: 2024, amount: 1200 }],
    });
    expect(r.form?.lines.map((l) => [l.code, l.installmentCode, l.debitAmount, l.creditAmount ?? 0])).toEqual([
      ['1792', '0101', 1000, 0],
      ['1790', '0101', 200, 0],
      ['1792', '0101', 0, 1200],
    ]);
    expect(r.amounts).toMatchObject({ taxBalance: 0, taxFirstAdvance: 300, inpsBalance: 2000 });
  });

  it('returns no form when there is no credit or nothing to offset', () => {
    expect(buildCompensation(ruleSet2026, { ...base, amounts: { taxBalance: 0, taxFirstAdvance: 0, taxSecondAdvance: 0, inpsBalance: 0, inpsFirstAdvance: 0, inpsSecondAdvance: 0 }, date: d('2026-06-30'), order: 'INPS_FIRST', credits: [{ id: 'c', section: 'TREASURY', code: '4001', referenceYear: 2025, amount: 50 }] }).form).toBeUndefined();
  });
});

describe('contribution scheme of the profile', () => {
  const amounts = { taxBalance: 1000, taxFirstAdvance: 400, taxSecondAdvance: 600, inpsBalance: 500, inpsFirstAdvance: 200, inpsSecondAdvance: 200 };

  it('writes no INPS rows for a scheme whose contributions are not computed', () => {
    const { forms } = buildPaymentSchedule(ruleSet2026, { ...base, amounts, contributionScheme: 'PROFESSIONAL_FUND', firstDueDate: d('2026-06-30'), installments: 1 });
    expect(forms.flatMap((f) => f.lines.map((l) => l.section))).not.toContain('INPS');
    expect(forms.flatMap((f) => f.lines.map((l) => l.code))).toEqual(['1792', '1790', '1791']);
  });

  it('offsets no INPS debt for a scheme whose contributions are not computed', () => {
    const credits = [{ id: 'c1', section: 'TREASURY' as const, code: '4001', referenceYear: 2025, amount: 300 }];
    const r = buildCompensation(ruleSet2026, { ...base, amounts, contributionScheme: 'PROFESSIONAL_FUND', date: d('2026-06-30'), credits, order: 'INPS_FIRST' });
    expect(r.form?.lines.filter((l) => l.role !== 'CREDIT').map((l) => l.code)).toEqual(['1792']);
  });
});
