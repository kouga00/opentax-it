import type { SdiReceipt } from '@opentax-it/fatturapa';

/**
 * Whether an uploaded SDI receipt is new, a duplicate or in conflict, as a pure function shared by the preview and
 * the import. SDI gives one outcome per file (RC, MC or NS): the same outcome seen again is a duplicate, a different
 * one is a conflict and is refused. "Seen" covers what is stored and what came earlier in the same upload.
 */
export type ReceiptDecision = { status: 'NEW' } | { status: 'DUPLICATE' } | { status: 'CONFLICT'; outcome: SdiReceipt['type'] };

export function decideReceipt(input: {
  receipt: SdiReceipt;
  /** The same receipt (same content key) is already stored. */
  alreadyRecorded: boolean;
  /** Outcome SDI already gave for the file: from the stored transmission, or from a receipt earlier in the upload. */
  knownOutcome?: SdiReceipt['type'];
}): ReceiptDecision {
  if (input.alreadyRecorded) return { status: 'DUPLICATE' };
  if (!input.knownOutcome) return { status: 'NEW' };
  return input.knownOutcome === input.receipt.type ? { status: 'DUPLICATE' } : { status: 'CONFLICT', outcome: input.knownOutcome };
}
