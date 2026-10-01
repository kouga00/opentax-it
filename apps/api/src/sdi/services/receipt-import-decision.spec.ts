import type { SdiReceipt } from '@opentax-it/fatturapa';
import { describe, expect, it } from 'vitest';
import { decideReceipt } from './receipt-import-decision.js';

const r = (type: SdiReceipt['type']): SdiReceipt => ({ type, sdiId: '1', fileName: 'f.xml', receivedAt: '2026-09-10T10:00:00', errors: [], messageId: '1' });

describe('decideReceipt (one SDI outcome per file)', () => {
  it('new when nothing is known', () => expect(decideReceipt({ receipt: r('RC'), alreadyRecorded: false })).toEqual({ status: 'NEW' }));
  it('duplicate when the same receipt is stored', () => expect(decideReceipt({ receipt: r('RC'), alreadyRecorded: true, knownOutcome: 'RC' })).toEqual({ status: 'DUPLICATE' }));
  it('duplicate when another copy gives the same outcome', () => expect(decideReceipt({ receipt: r('MC'), alreadyRecorded: false, knownOutcome: 'MC' })).toEqual({ status: 'DUPLICATE' }));
  it('conflict when the outcome differs', () => expect(decideReceipt({ receipt: r('NS'), alreadyRecorded: false, knownOutcome: 'RC' })).toEqual({ status: 'CONFLICT', outcome: 'RC' }));
});
