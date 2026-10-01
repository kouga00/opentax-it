import type { Payment } from '../../generated/prisma/client.js';

/** Collections of an issued document and what is left to collect, in the document currency. */
export interface InvoiceCollection {
  invoiceId: string;
  currency: string;
  total: number;
  /** Credit note: its refunds are recorded as negative collections. */
  refund: boolean;
  /** Collected (refunded, for a credit note) so far, as a positive amount. */
  collected: number;
  remaining: number;
  /** ModalitaPagamento asked in the document, e.g. MP05; null when it has no DatiPagamento. */
  paymentMethod: string | null;
  payments: Payment[];
}
