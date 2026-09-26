import type { SdiTransmissionStatus } from '../../generated/prisma/enums.js';

/** Transmissions still waiting for an SDI outcome: the ones the receipts sync looks for. */
export const AWAITING_OUTCOME: SdiTransmissionStatus[] = ['PENDING', 'SENT', 'ACCEPTED_BY_PEC', 'DELIVERED_TO_SDI'];

/** Outcomes of SDI: the file was delivered, made available, or rejected ("mai emessa"). Nothing overrides them. */
export const SDI_OUTCOMES: SdiTransmissionStatus[] = ['SDI_DELIVERED', 'SDI_NOT_DELIVERED', 'SDI_REJECTED'];
