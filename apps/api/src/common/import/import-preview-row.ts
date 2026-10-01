import type { XmlDocumentKind } from '@opentax-it/fatturapa';
import type { IMPORT_PREVIEW_STATUSES } from './import-statuses.js';

/** One document of an upload in the preview, whatever its kind. */
export interface ImportPreviewRow {
  file: string;
  /** Kind of document, when recognised. */
  kind?: XmlDocumentKind;
  status: (typeof IMPORT_PREVIEW_STATUSES)[number];
  /** Another row that must be imported too (a receipt of an invoice in the same upload). */
  requires?: string;
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
