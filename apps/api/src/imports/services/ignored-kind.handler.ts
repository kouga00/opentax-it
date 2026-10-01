import type { XmlDocumentKind } from '@opentax-it/fatturapa';
import type { ImportHandler } from '../../common/import/import-handler.js';
import type { ImportPreviewRow } from '../../common/import/import-preview-row.js';
import type { ImportResult } from '../../common/import/import-result.js';
import type { XmlEntry } from '../../common/import/xml-entry.js';

/**
 * Handler for a kind of document that is recognised but not imported: every file is listed as ignored with the
 * reason, and nothing is written. Registered like the other handlers, so the orchestrator knows no kind by name.
 */
export class IgnoredKindHandler implements ImportHandler {
  constructor(
    readonly kind: XmlDocumentKind,
    private readonly reason: string,
  ) {}

  preview(_tenantId: string, entries: XmlEntry[]): Promise<ImportPreviewRow[]> {
    return Promise.resolve(entries.map((e) => ({ file: e.name, kind: this.kind, status: 'IGNORED' as const, message: this.reason })));
  }

  importEntries(): Promise<ImportResult[]> {
    return Promise.resolve([]);
  }
}
