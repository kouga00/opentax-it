import { strToU8, zipSync } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import type { ImportHandler } from '../../common/import/import-handler.js';
import type { XmlEntry } from '../../common/import/xml-entry.js';
import { DocumentImportService } from './document-import.service.js';

const invoice = '<?xml version="1.0"?><p:FatturaElettronica versione="FPR12" xmlns:p="x"/>';
const receipt = '<?xml version="1.0"?><?xml-stylesheet href="RC_v1.0.xsl"?><types:RicevutaConsegna xmlns:types="x"/>';
const metadata = '<ns2:FileMetadati xmlns:ns2="x"/>';
const esito = '<types:NotificaEsito xmlns:types="x"/>';

const zip = (entries: Record<string, string>) => Buffer.from(zipSync(Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, strToU8(v)]))));

function handler(kind: ImportHandler['kind'], calls: string[]): ImportHandler {
  return {
    kind,
    preview: vi.fn((_t: string, entries: XmlEntry[]) => Promise.resolve(entries.map((e) => ({ file: e.name, kind, status: 'NEW' as const })))),
    importEntries: vi.fn((_t: string, entries: XmlEntry[]) => {
      calls.push(...entries.map((e) => `${kind}:${e.fileName}`));
      return Promise.resolve(entries.map((e) => ({ file: e.name, kind, status: 'IMPORTED' as const })));
    }),
  };
}

function setup() {
  const calls: string[] = [];
  const service = new DocumentImportService([handler('INVOICE', calls), handler('SDI_RECEIPT', calls)]);
  // A mixed archive like the portal's: the receipt comes before its invoice in the ZIP.
  const files = [{ name: 'portale.zip', content: zip({ 'f_RC_001.xml': receipt, 'f.xml': invoice, 'f_MT_001.xml': metadata, 'esito.xml': esito, 'altro.xml': '<Nota/>' }) }];
  return { service, calls, files };
}

describe('DocumentImportService (Strategy with a registry)', () => {
  it('hands each document to the handler of its kind and lists the rest as ignored, with the reason', async () => {
    const { service, files } = setup();
    const rows = await service.preview('t1', files);
    expect(rows.map((r) => [r.file, r.kind, r.status])).toEqual([
      ['portale.zip/f.xml', 'INVOICE', 'NEW'],
      ['portale.zip/f_RC_001.xml', 'SDI_RECEIPT', 'NEW'],
      ['portale.zip/f_MT_001.xml', 'SDI_METADATA', 'IGNORED'],
      ['portale.zip/esito.xml', 'SDI_MESSAGE', 'IGNORED'],
      ['portale.zip/altro.xml', undefined, 'IGNORED'],
    ]);
    expect(rows[2].message).toBe('File di metadati SDI: non contiene la fattura');
    expect(rows[4].message).toBe('Non è una fattura FatturaPA né una ricevuta SDI');
  });

  it('imports invoices before the receipts that refer to them, whatever the order in the archive', async () => {
    const { service, calls, files } = setup();
    await service.importFiles('t1', files);
    expect(calls).toEqual(['INVOICE:f.xml', 'SDI_RECEIPT:f_RC_001.xml']);
  });

  it('imports only the selected rows', async () => {
    const { service, calls, files } = setup();
    const results = await service.importFiles('t1', files, ['portale.zip/f_RC_001.xml']);
    expect(results.map((r) => r.file)).toEqual(['portale.zip/f_RC_001.xml']);
    expect(calls).toEqual(['SDI_RECEIPT:f_RC_001.xml']);
  });
});
