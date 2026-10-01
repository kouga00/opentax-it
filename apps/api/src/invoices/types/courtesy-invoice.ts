import type { CourtesyInvoiceParty } from './courtesy-invoice-party.js';
import type { CourtesyInvoiceSupplier } from './courtesy-invoice-supplier.js';
import type { CourtesyInvoiceLine } from './courtesy-invoice-line.js';
import type { CourtesyInvoicePayment } from './courtesy-invoice-payment.js';

export interface CourtesyInvoice {
  id: string;
  documentType: string;
  number: string;
  date: string;
  currency: string;
  isDraft: boolean;
  status: string;
  supplier: CourtesyInvoiceSupplier;
  customer: CourtesyInvoiceParty & { recipientCode: string };
  lines: CourtesyInvoiceLine[];
  taxableAmount: number;
  inpsSurcharge: number;
  inpsRatePct?: number;
  /** Professional fund contribution (DatiCassaPrevidenziale TC01-TC21). */
  professionalFund?: { type: string; ratePct: number; amount: number };
  vatAmount: number;
  virtualStamp: boolean;
  stampAmount: number;
  total: number;
  payment?: CourtesyInvoicePayment;
  notes: string[];
}
