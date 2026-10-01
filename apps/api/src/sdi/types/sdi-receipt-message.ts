import type { SdiReceipt } from '@opentax-it/fatturapa';

/** A PEC message certified as sent by SDI, with the receipts attached to it. */
export interface SdiReceiptMessage {
  kind: 'sdi-receipt';
  /** Certified sender (daticert.xml "mittente"): the SDI address to use for the next transmissions. */
  sdiAddress: string;
  receipts: Array<{ fileName: string; xml: Buffer; receipt: SdiReceipt }>;
}
