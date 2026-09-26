import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseSdiReceipt, parseSdiReceiptFileName } from './sdi-receipts.js';

// Official examples from fatturapa.gov.it, "Documentazione Sistema d'Interscambio" (schemas/messaggi/README.md).
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas', 'messaggi');
const example = (name: string) => readFileSync(join(dir, name));

describe('parseSdiReceipt on the official examples', () => {
  it('reads the delivery receipt (RC) with the delivery time', () => {
    expect(parseSdiReceipt(example('IT01234567890_11111_RC_001.xml'))).toMatchObject({
      type: 'RC', sdiId: '111', fileName: 'IT01234567890_11111.xml.p7m', receivedAt: '2013-06-06T12:00:00Z', deliveredAt: '2013-06-06T12:01:00Z', messageId: '123456', errors: [],
    });
  });

  it('reads the rejection receipt (NS) with its errors', () => {
    expect(parseSdiReceipt(example('IT01234567890_11111_NS_001.xml'))).toMatchObject({
      type: 'NS', sdiId: '111', fileName: 'IT01234567890_11111.xml.p7m', errors: [{ code: '00100', description: 'Certificato di firma scaduto' }],
    });
  });

  it('reads the failed delivery receipt (MC)', () => {
    expect(parseSdiReceipt(example('IT01234567890_11111_MC_001.xml'))).toMatchObject({
      type: 'MC', sdiId: '111', fileName: 'IT01234567890_11111.xml.p7m', receivedAt: '2013-06-06T12:00:00', description: 'Notifica di esempio',
    });
  });

  it('ignores other SDI messages and refuses incomplete receipts', () => {
    expect(parseSdiReceipt('<NotificaEsito><IdentificativoSdI>1</IdentificativoSdI></NotificaEsito>')).toBeUndefined();
    expect(() => parseSdiReceipt('<RicevutaConsegna><NomeFile>x.xml</NomeFile></RicevutaConsegna>')).toThrow('Incomplete');
  });
});

describe('parseSdiReceiptFileName (Spec. 1.9.1, nomenclatura delle ricevute)', () => {
  it('splits invoice file, type and progressive', () => {
    expect(parseSdiReceiptFileName('IT01234567890_11111_RC_001.xml')).toEqual({ invoiceFileBase: 'IT01234567890_11111', type: 'RC', progressive: '001' });
    expect(parseSdiReceiptFileName('ITAAABBB99T99X999W_00001_NS_001.xml')?.type).toBe('NS');
  });

  it('does not match an invoice file name', () => {
    expect(parseSdiReceiptFileName('IT01234567890_11111.xml')).toBeUndefined();
  });
});
