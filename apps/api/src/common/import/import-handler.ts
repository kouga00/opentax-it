import type { XmlDocumentKind } from '@opentax-it/fatturapa';
import type { ImportContext } from './import-context.js';
import type { ImportPreviewRow } from './import-preview-row.js';
import type { ImportResult } from './import-result.js';
import type { XmlEntry } from './xml-entry.js';

/**
 * Strategy for one kind of XML document in an upload (imports module, DocumentImportService): the orchestrator
 * sends each handler the documents of its kind, in the order of the registry, and merges the rows.
 */
export interface ImportHandler {
  /** Kind of document this handler takes (fatturapa xmlDocumentKind). */
  readonly kind: XmlDocumentKind;
  /** What importing these documents would do, without writing anything; `context` carries what earlier handlers will create. */
  preview(tenantId: string, entries: XmlEntry[], context: ImportContext): Promise<ImportPreviewRow[]>;
  /** Imports the documents; one result per document, errors included. */
  importEntries(tenantId: string, entries: XmlEntry[]): Promise<ImportResult[]>;
}
