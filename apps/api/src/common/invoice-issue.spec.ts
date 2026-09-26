import { describe, expect, it } from 'vitest';
import { isIssued } from './invoice-issue.js';

describe('isIssued (Spec. FatturaPA 1.9.1 §1.6)', () => {
  it('delivered (RC) or made available (MC)', () => {
    expect(isIssued({ status: 'DELIVERED', imported: false })).toBe(true);
    expect(isIssued({ status: 'NOT_DELIVERED', imported: false })).toBe(true);
  });

  it('imported from another tool, until its receipts say otherwise', () => {
    expect(isIssued({ status: 'ISSUED', imported: true })).toBe(true);
  });

  it('not yet: to send, sent without outcome, rejected, draft', () => {
    for (const status of ['ISSUED', 'SENT', 'REJECTED', 'DRAFT', 'CANCELLED'] as const) expect(isIssued({ status, imported: false })).toBe(false);
  });
});
