import { parseInvoiceXml } from '@opentax-it/fatturapa';
import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { extractXmlEntries, MAX_ARCHIVE_ENTRIES, MAX_INVOICE_FILE_BYTES } from './invoice-archive.js';

// Same shape as a real download (flat, entries stored without compression, FPR12 with an "ns3" prefix
// on the root element, SDI file names of an intermediary), with invented data.
const invoice = (number: string) => `<?xml version="1.0" encoding="UTF-8"?><ns3:FatturaElettronica versione="FPR12" xmlns:ns2="http://www.w3.org/2000/09/xmldsig#" xmlns:ns3="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">
    <FatturaElettronicaHeader>
        <DatiTrasmissione><IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>01234567890</IdCodice></IdTrasmittente><ProgressivoInvio>00001</ProgressivoInvio><FormatoTrasmissione>FPR12</FormatoTrasmissione><CodiceDestinatario>0000000</CodiceDestinatario></DatiTrasmissione>
        <CedentePrestatore><DatiAnagrafici><IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>01234567890</IdCodice></IdFiscaleIVA><Anagrafica><Nome>Mario</Nome><Cognome>Rossi</Cognome></Anagrafica><RegimeFiscale>RF19</RegimeFiscale></DatiAnagrafici><Sede><Indirizzo>Via Roma 1</Indirizzo><CAP>00100</CAP><Comune>Roma</Comune><Provincia>RM</Provincia><Nazione>IT</Nazione></Sede></CedentePrestatore>
        <CessionarioCommittente><DatiAnagrafici><IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>09876543210</IdCodice></IdFiscaleIVA><Anagrafica><Denominazione>Cliente Srl</Denominazione></Anagrafica></DatiAnagrafici><Sede><Indirizzo>Via Milano 2</Indirizzo><CAP>20100</CAP><Comune>Milano</Comune><Provincia>MI</Provincia><Nazione>IT</Nazione></Sede></CessionarioCommittente>
    </FatturaElettronicaHeader>
    <FatturaElettronicaBody>
        <DatiGenerali><DatiGeneraliDocumento><TipoDocumento>TD01</TipoDocumento><Divisa>EUR</Divisa><Data>2026-03-02</Data><Numero>${number}</Numero><DatiBollo><BolloVirtuale>SI</BolloVirtuale><ImportoBollo>2.00</ImportoBollo></DatiBollo><ImportoTotaleDocumento>1002.00</ImportoTotaleDocumento></DatiGeneraliDocumento></DatiGenerali>
        <DatiBeniServizi><DettaglioLinee><NumeroLinea>1</NumeroLinea><Descrizione>Consulenza</Descrizione><Quantita>1.00</Quantita><PrezzoUnitario>1000.00</PrezzoUnitario><PrezzoTotale>1000.00</PrezzoTotale><AliquotaIVA>0.00</AliquotaIVA><Natura>N2.2</Natura></DettaglioLinee><DatiRiepilogo><AliquotaIVA>0.00</AliquotaIVA><Natura>N2.2</Natura><ImponibileImporto>1000.00</ImponibileImporto><Imposta>0.00</Imposta><RiferimentoNormativo>Regime forfettario</RiferimentoNormativo></DatiRiepilogo></DatiBeniServizi>
    </FatturaElettronicaBody>
</ns3:FatturaElettronica>`;

// Spec. FatturaPA 1.9.1 §1.1.4: metadata file sent by SDI with the invoice (AdE schema, root FileMetadati).
const metadata = `<?xml version="1.0" encoding="UTF-8"?><ns2:FileMetadati xmlns:ns2="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fattura/messaggi/v1.0" versione="1.0"><IdentificativoSdI>111</IdentificativoSdI><NomeFile>IT01234567890_00001.xml</NomeFile></ns2:FileMetadati>`;

const zip = (entries: Record<string, string | Uint8Array>, level: 0 | 6 = 0) =>
  Buffer.from(zipSync(Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, typeof v === 'string' ? strToU8(v) : v])), { level }));

describe('extractXmlEntries', () => {
  it('reads a flat archive like the real download, and each entry parses as a FatturaPA', () => {
    const { entries, ignored } = extractXmlEntries([{ name: 'fatture-xml.zip', content: zip({ 'IT01234567890_0000a.xml': invoice('1'), 'IT01234567890_0000b.xml': invoice('2') }) }]);
    expect(ignored).toEqual([]);
    expect(entries.map((e) => [e.name, e.fileName])).toEqual([
      ['fatture-xml.zip/IT01234567890_0000a.xml', 'IT01234567890_0000a.xml'],
      ['fatture-xml.zip/IT01234567890_0000b.xml', 'IT01234567890_0000b.xml'],
    ]);
    expect(entries.map((e) => parseInvoiceXml(e.xml).number)).toEqual(['1', '2']);
  });

  it('reads compressed entries in folders and loose XML files', () => {
    const { entries } = extractXmlEntries([
      { name: 'a.zip', content: zip({ 'emesse/2026/': new Uint8Array(0), 'emesse/2026/f1.XML': invoice('1') }, 6) },
      { name: 'f2.xml', content: Buffer.from(invoice('2')) },
    ]);
    expect(entries.map((e) => [e.name, e.fileName])).toEqual([['a.zip/emesse/2026/f1.XML', 'f1.XML'], ['f2.xml', 'f2.xml']]);
  });

  it('sets aside SDI metadata, signed files and other files with a reason', () => {
    const { entries, ignored } = extractXmlEntries([
      { name: 'a.zip', content: zip({ 'f_MT_001.xml': metadata, 'f.xml.p7m': new Uint8Array([0x30, 0x80]), 'f.pdf': 'x', 'f.xml': invoice('1') }) },
      { name: 'note.txt', content: Buffer.from('x') },
    ]);
    expect(entries.map((e) => e.name)).toEqual(['a.zip/f.xml']);
    expect(ignored).toEqual([
      { name: 'a.zip/f.xml.p7m', message: 'Fattura firmata (.p7m): non ancora supportata' },
      { name: 'a.zip/f.pdf', message: 'Non è un file XML o ZIP' },
      { name: 'a.zip/f_MT_001.xml', message: 'File di metadati SDI: non contiene la fattura' },
      { name: 'note.txt', message: 'Non è un file XML o ZIP' },
    ]);
  });

  it('refuses entries over 5 MB without extracting them, and unreadable archives', () => {
    const big = new Uint8Array(MAX_INVOICE_FILE_BYTES + 1).fill(0x20);
    const { entries, ignored } = extractXmlEntries([
      { name: 'a.zip', content: zip({ 'big.xml': big }, 6) },
      { name: 'b.zip', content: Buffer.from([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]) },
    ]);
    expect(entries).toEqual([]);
    expect(ignored).toEqual([
      { name: 'a.zip/big.xml', message: 'Supera 5 MB, il limite SDI per un file fattura' },
      { name: 'b.zip', message: 'Archivio ZIP non leggibile' },
    ]);
  });

  it('refuses the whole archive above the entry limit', () => {
    const many = Object.fromEntries(Array.from({ length: MAX_ARCHIVE_ENTRIES + 1 }, (_, i) => [`f${i}.xml`, 'x']));
    const { entries, ignored } = extractXmlEntries([{ name: 'a.zip', content: zip(many) }]);
    expect(entries).toEqual([]);
    expect(ignored.at(-1)).toEqual({ name: 'a.zip', message: `Contiene più di ${MAX_ARCHIVE_ENTRIES} file: dividilo in archivi più piccoli` });
  });
});
