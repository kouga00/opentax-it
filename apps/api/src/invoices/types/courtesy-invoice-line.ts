export interface CourtesyInvoiceLine {
  lineNumber: number;
  description: string;
  quantity?: number;
  unit?: string;
  unitPrice: number;
  totalPrice: number;
  vatRatePct: number;
  vatNature: string;
}
