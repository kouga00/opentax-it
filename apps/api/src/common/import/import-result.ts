import type { XmlDocumentKind } from '@opentax-it/fatturapa';

/** Outcome of importing one document of an upload, whatever its kind. */
export interface ImportResult {
  file: string;
  kind?: XmlDocumentKind;
  status: 'IMPORTED' | 'SKIPPED' | 'ERROR';
  number?: string;
  invoiceId?: string;
  customer?: string;
  message?: string;
}
