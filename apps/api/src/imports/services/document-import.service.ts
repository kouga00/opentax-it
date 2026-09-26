import { Inject, Injectable } from '@nestjs/common';
import { xmlDocumentKind, type XmlDocumentKind } from '@opentax-it/fatturapa';
import { extractXmlEntries } from '../../common/import/archive-reader.js';
import { newImportContext } from '../../common/import/import-context.js';
import type { ImportHandler } from '../../common/import/import-handler.js';
import type { ImportPreviewRow } from '../../common/import/import-preview-row.js';
import type { ImportResult } from '../../common/import/import-result.js';
import type { UploadedFile } from '../../common/import/uploaded-file.js';
import type { XmlEntry } from '../../common/import/xml-entry.js';
import { IMPORT_HANDLERS } from '../types/import-handlers.token.js';

/**
 * Import of the documents in an upload: loose XML files and ZIP archives, such as those of the AdE portal, which mix
 * invoices, SDI receipts and metadata.
 *
 * Pattern: Strategy with a registry. The problem it solves: each kind of document has its own rules and belongs to
 * its own module (invoices to the invoices module, receipts to the sdi module), yet they arrive together. This
 * orchestrator only extracts the XML files, recognises each one by its root element (fatturapa xmlDocumentKind) and
 * hands it to the handler of that kind (ImportHandler); what no handler takes is listed as ignored, with the reason.
 * Handlers run in the order of the registry: invoices before receipts, so that an archive with an invoice and its
 * receipt is imported in one go; in the preview they share an ImportContext, so that the receipt of an invoice in
 * the same archive is shown as importable. A new kind of document is a new handler, with no change here.
 */

/** Why a recognised document with no handler is set aside. */
const NOT_IMPORTED: Partial<Record<XmlDocumentKind, string>> = {
  SDI_METADATA: 'File di metadati SDI: non contiene la fattura',
  SDI_MESSAGE: 'Messaggio SDI non gestito (riguarda le fatture verso la pubblica amministrazione)',
};

@Injectable()
export class DocumentImportService {
  constructor(@Inject(IMPORT_HANDLERS) private readonly handlers: ImportHandler[]) {}

  /** What importing these files would do, without writing anything. */
  async preview(tenantId: string, files: UploadedFile[]): Promise<ImportPreviewRow[]> {
    const { groups, ignored } = this.sort(files);
    const rows: ImportPreviewRow[] = [];
    const context = newImportContext();
    for (const [handler, entries] of groups) rows.push(...(await handler.preview(tenantId, entries, context)));
    return [...rows, ...ignored];
  }

  /** Imports the documents in the files; with `selected`, only the entries with those names (rows of the preview). */
  async importFiles(tenantId: string, files: UploadedFile[], selected?: string[]): Promise<ImportResult[]> {
    const only = selected ? new Set(selected) : undefined;
    const { groups } = this.sort(files);
    const results: ImportResult[] = [];
    for (const [handler, entries] of groups) {
      const chosen = only ? entries.filter((e) => only.has(e.name)) : entries;
      if (chosen.length) results.push(...(await handler.importEntries(tenantId, chosen)));
    }
    return results;
  }

  /** Groups the XML files by handler, in the order of the registry, and lists the rest as ignored. */
  private sort(files: UploadedFile[]): { groups: Array<[ImportHandler, XmlEntry[]]>; ignored: ImportPreviewRow[] } {
    const { entries, ignored } = extractXmlEntries(files);
    const groups = new Map<ImportHandler, XmlEntry[]>(this.handlers.map((h) => [h, []]));
    const rows: ImportPreviewRow[] = ignored.map((i) => ({ file: i.name, status: 'IGNORED', message: i.message }));
    for (const e of entries) {
      const kind = xmlDocumentKind(e.xml);
      const handler = this.handlers.find((h) => h.kind === kind);
      if (handler) groups.get(handler)!.push(e);
      else rows.push({ file: e.name, kind, status: 'IGNORED', message: (kind && NOT_IMPORTED[kind]) ?? 'Non è una fattura FatturaPA né una ricevuta SDI' });
    }
    return { groups: [...groups].filter(([, list]) => list.length > 0), ignored: rows };
  }
}
