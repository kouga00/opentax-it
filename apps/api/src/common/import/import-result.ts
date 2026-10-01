import type { XmlDocumentKind } from '@opentax-it/fatturapa';
import type { IMPORT_RESULT_STATUSES } from './import-statuses.js';

/** Outcome of importing one document of an upload, whatever its kind. */
export interface ImportResult {
  file: string;
  kind?: XmlDocumentKind;
  status: (typeof IMPORT_RESULT_STATUSES)[number];
  number?: string;
  invoiceId?: string;
  customer?: string;
  message?: string;
}
