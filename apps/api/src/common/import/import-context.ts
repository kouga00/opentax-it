/**
 * Shared by the handlers during one preview, in the order they run: what the upload is going to create, so that a
 * later handler can refer to it (a receipt to an invoice in the same archive, not stored yet).
 */
export interface ImportContext {
  /** Invoices the upload will import, by SDI file name, with their number. */
  upcomingInvoices: Map<string, { number: string }>;
}

export const newImportContext = (): ImportContext => ({ upcomingInvoices: new Map() });
