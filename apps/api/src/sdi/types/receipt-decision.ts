import type { SdiReceipt } from '@opentax-it/fatturapa';

/** Whether an uploaded SDI receipt is new, a duplicate or in conflict with the outcome SDI already gave (decideReceipt). */
export type ReceiptDecision = { status: 'NEW' } | { status: 'DUPLICATE' } | { status: 'CONFLICT'; outcome: SdiReceipt['type'] };
