export interface CourtesyInvoiceParty {
  name: string;
  taxRegime?: string;
  vatNumber?: string;
  fiscalCode?: string;
  address: string;
  postalCode?: string;
  city: string;
  province?: string;
  country: string;
  pec?: string;
}
