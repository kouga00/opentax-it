import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { xmlDocumentKind } from './xml-document-kind.js';

const messages = join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas', 'messaggi');

describe('xmlDocumentKind', () => {
  it('recognizes the official receipt examples (RC, NS, MC)', () => {
    for (const f of ['IT01234567890_11111_RC_001.xml', 'IT01234567890_11111_NS_001.xml', 'IT01234567890_11111_MC_001.xml']) {
      expect(xmlDocumentKind(readFileSync(join(messages, f), 'utf8'))).toBe('SDI_RECEIPT');
    }
  });

  it('recognizes invoices, metadata and other SDI messages, with or without prefix', () => {
    expect(xmlDocumentKind('<?xml version="1.0"?><p:FatturaElettronica versione="FPR12" xmlns:p="x">')).toBe('INVOICE');
    expect(xmlDocumentKind('<FileMetadati><IdentificativoSdI>1</IdentificativoSdI></FileMetadati>')).toBe('SDI_METADATA');
    expect(xmlDocumentKind('<ns2:MetadatiInvioFile xmlns:ns2="x">')).toBe('SDI_METADATA');
    expect(xmlDocumentKind('<types:NotificaEsito versione="1.0">')).toBe('SDI_MESSAGE');
  });

  it('looks only at the root element', () => {
    expect(xmlDocumentKind('<Qualcosa><FatturaElettronica/></Qualcosa>')).toBeUndefined();
    expect(xmlDocumentKind('non è xml')).toBeUndefined();
  });
});
