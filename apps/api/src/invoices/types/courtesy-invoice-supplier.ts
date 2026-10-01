import type { CourtesyInvoiceParty } from './courtesy-invoice-party.js';

export interface CourtesyInvoiceSupplier extends CourtesyInvoiceParty {
  taxRegime: string;
}
