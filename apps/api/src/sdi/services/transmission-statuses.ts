import type { SdiReceipt } from '@opentax-it/fatturapa';
import type { InvoiceStatus, SdiTransmissionStatus } from '../../generated/prisma/enums.js';

/** Transmissions still waiting for an SDI outcome: the ones the receipts sync looks for. */
export const AWAITING_OUTCOME: SdiTransmissionStatus[] = ['PENDING', 'SENT', 'ACCEPTED_BY_PEC', 'DELIVERED_TO_SDI'];

/** Outcomes of SDI: the file was delivered, made available, or rejected ("mai emessa"). Nothing overrides them. */
export const SDI_OUTCOMES: SdiTransmissionStatus[] = ['SDI_DELIVERED', 'SDI_NOT_DELIVERED', 'SDI_REJECTED'];

/** Outcome each SDI receipt gives (Spec. 1.9.1 §1.5.7): RC delivered, MC made available (the invoice is issued), NS rejected. */
export const SDI_OUTCOME_BY_RECEIPT: Record<SdiReceipt['type'], { transmission: SdiTransmissionStatus; invoice: Extract<InvoiceStatus, 'DELIVERED' | 'NOT_DELIVERED' | 'REJECTED'> }> = {
  RC: { transmission: 'SDI_DELIVERED', invoice: 'DELIVERED' },
  MC: { transmission: 'SDI_NOT_DELIVERED', invoice: 'NOT_DELIVERED' },
  NS: { transmission: 'SDI_REJECTED', invoice: 'REJECTED' },
};

/** The receipt that gave an outcome already recorded on a transmission (inverse of SDI_OUTCOME_BY_RECEIPT). */
export const receiptOfOutcome = (status: SdiTransmissionStatus): SdiReceipt['type'] | undefined =>
  (Object.keys(SDI_OUTCOME_BY_RECEIPT) as Array<SdiReceipt['type']>).find((type) => SDI_OUTCOME_BY_RECEIPT[type].transmission === status);
