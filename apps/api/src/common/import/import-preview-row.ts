import type { XmlDocumentKind } from '@opentax-it/fatturapa';

/** One document of an upload in the preview, whatever its kind. */
export interface ImportPreviewRow {
  file: string;
  /** Kind of document, when recognised. */
  kind?: XmlDocumentKind;
  /** NEW: will be imported; DUPLICATE: already present; ERROR: cannot be imported; IGNORED: not a document to import. */
  status: 'NEW' | 'DUPLICATE' | 'ERROR' | 'IGNORED';
  /** Invoice: TipoDocumento (TD01...); SDI receipt: RC, NS or MC. */
  documentType?: string;
  /** Invoice number (for a receipt, of the invoice it refers to). */
  number?: string;
  date?: string;
  customer?: string;
  total?: number;
  invoiceId?: string;
  message?: string;
}
