import type { InvoiceStatus, SdiTransmissionStatus } from '../../generated/prisma/enums.js';

/** How a receipt moves a transmission and its invoice (transmission-transitions.ts). */
export interface Transition {
  transmission: { status: SdiTransmissionStatus; sentAt?: Date; pecProviderId?: string; lastError?: string | null; sdiId?: string };
  /** REOPEN puts a sent invoice back to issued, CLAIM marks an issued one as sent again; otherwise the SDI outcome. */
  invoice?: 'REOPEN' | 'CLAIM' | Extract<InvoiceStatus, 'DELIVERED' | 'NOT_DELIVERED' | 'REJECTED'>;
  /** With an RC or MC outcome: the day of delivery or of availability (YYYY-MM-DD), when the receipt gives it. */
  deliveredOn?: string;
}
