import { describe, expect, it } from 'vitest';
import { amount8, buildInvoiceXml, computeTotals, invoiceFileName, nextFileSequence, sanitizeText, validateInvoice } from './builder';
import type { FlatRateInvoice } from './types';
import { isXmllintAvailable, validateWithXsd } from './xsd';

const supplier: FlatRateInvoice['supplier'] = {
  countryCode: 'IT',
  vatNumber: '01234567890',
  fiscalCode: 'RSSMRA80A01H501U',
  firstName: 'Mario',
  lastName: 'Rossi',
  taxRegime: 'RF19',
  address: { street: 'Via Roma 1', postalCode: '00100', city: 'Roma', province: 'RM', country: 'IT' },
};

const notes = [
  "Operazione effettuata in regime forfettario ai sensi dell'articolo 1, commi da 54 a 89, della Legge n. 190/2014 e successive modificazioni",
  "Operazione non soggetta a ritenuta alla fonte a titolo di acconto ai sensi dell'articolo 1, comma 67, Legge n. 190 del 2014 e successive modificazioni",
];

const domestic: FlatRateInvoice = {
  format: 'FPR12',
  transmissionId: '00001',
  recipientCode: '0000000',
  recipientPec: 'cliente@pec.example.it',
  supplier,
  customer: {
    countryCode: 'IT',
    vatNumber: '09876543210',
    businessName: 'ACME S.r.l.',
    address: { street: 'Via Milano 2', postalCode: '20100', city: 'Milano', province: 'MI', country: 'IT' },
  },
  documentType: 'TD01',
  number: '1/2026',
  date: '2026-09-21',
  currency: 'EUR',
  vatNature: 'N2.2',
  legalReference: 'Art. 1, commi 54-89, L. 190/2014',
  notes,
  lines: [
    { description: 'Sviluppo software — settembre 2026', quantity: 10, unit: 'ore', unitPrice: 50, totalPrice: 500 },
    { description: 'Consulenza', unitPrice: 300, totalPrice: 300 },
  ],
  socialSecurityFund: { type: 'TC22', ratePct: 4, taxable: 800, amount: 32 },
  stampDuty: { amount: 2 },
  payment: { terms: 'TP02', method: 'MP05', installments: [{ dueDate: '2026-10-21', amount: 834 }], iban: 'IT60X0542811101000000123456' },
};

const foreign: FlatRateInvoice = {
  ...domestic,
  transmissionId: '00002',
  recipientCode: 'XXXXXXX',
  recipientPec: undefined,
  customer: {
    countryCode: 'DE',
    vatNumber: 'DE123456789',
    businessName: 'Beispiel GmbH',
    address: { street: 'Hauptstraße 5', postalCode: '00000', city: 'Berlin', country: 'DE' },
  },
  vatNature: 'N2.1',
  legalReference: 'Art. 7-ter DPR 633/72 - inversione contabile',
  notes: [...notes, 'inversione contabile'],
  lineManagementData: [{ type: 'INVCONT' }],
  socialSecurityFund: undefined,
  stampDuty: undefined,
  payment: undefined,
};

describe('computeTotals', () => {
  it('includes the fund contribution in the taxable amount and the stamp duty in the document total', () => {
    expect(computeTotals(domestic)).toEqual({ linesTotal: 800, fund: 32, stamp: 2, taxable: 832, documentTotal: 834 });
  });
});

describe('sanitizeText', () => {
  it('maps typographic punctuation to ASCII and keeps Latin-1 letters', () => {
    expect(sanitizeText('Sviluppo — “test” … Hauptstraße €')).toBe('Sviluppo - "test" ... Hauptstraße EUR');
    expect(sanitizeText('emoji 🚀 dropped')).toBe('emoji  dropped');
  });

  it('normalizes NBSP to regular space', () => {
    expect(sanitizeText('non\u00A0breaking')).toBe('non breaking');
  });

  it('converts newlines and tabs to spaces without concatenating words (collapsing CRLF)', () => {
    expect(sanitizeText('riga1\nriga2\r\nriga3\ttab')).toBe('riga1 riga2 riga3 tab');
  });

  it('discards C0 control characters, DEL (0x7F) and C1 controls (0x80–0x9F)', () => {
    expect(sanitizeText('test\x07with\x7Fcontrols\x85and\x9Fmore')).toBe('testwithcontrolsandmore');
  });
});

describe('formatting', () => {
  it('amount8 keeps 2 to 8 decimals', () => {
    expect(amount8(50)).toBe('50.00');
    expect(amount8(12.5)).toBe('12.50');
    expect(amount8(0.123456789)).toBe('0.12345679');
  });

  it('nextFileSequence goes above every name already used by the same transmitter (error 00002)', () => {
    const names = ['IT01234567890_00001.xml', 'IT01234567890_0000A.xml', 'IT01234567890_00012.xml.p7m', 'ITOTHER000000_ZZZZZ.xml', 'fattura.xml'];
    expect(nextFileSequence(names, 'IT', '01234567890')).toBe(parseInt('00012', 36) + 1);
    expect(invoiceFileName('IT', '01234567890', nextFileSequence(names, 'IT', '01234567890'))).toBe('IT01234567890_00013.xml');
    // A configured start skips names sent elsewhere and not imported.
    expect(nextFileSequence(names, 'IT', '01234567890', '00100')).toBe(parseInt('00100', 36));
    expect(nextFileSequence([], 'IT', '01234567890')).toBe(1);
  });

  it('invoiceFileName follows <country><id>_<progressive>.xml', () => {
    expect(invoiceFileName('IT', 'RSSMRA80A01H501U', 1)).toBe('ITRSSMRA80A01H501U_00001.xml');
    expect(invoiceFileName('IT', '01234567890', 35)).toBe('IT01234567890_0000Z.xml');
  });
});

describe('validateInvoice', () => {
  it('requires a 6-character recipient code with FPA12 and 7 with FPR12 (error 00427)', () => {
    expect(validateInvoice({ ...domestic, format: 'FPA12', recipientCode: 'UFABCD' })).not.toContain('recipientCode must be 6 characters with FPA12 (error 00427)');
    expect(validateInvoice({ ...domestic, format: 'FPA12', recipientCode: 'ABCDEF1' })).toContain('recipientCode must be 6 characters with FPA12 (error 00427)');
    expect(validateInvoice({ ...domestic, format: 'FPR12', recipientCode: 'UFABCD' })).toContain('recipientCode must be 7 characters with FPR12 (error 00427)');
  });

  it('rejects XXXXXXX for an Italian customer and credit notes without reference', () => {
    expect(validateInvoice({ ...domestic, recipientCode: 'XXXXXXX' })).toContain('recipientCode XXXXXXX requires a non-IT customer (error 00313)');
    expect(validateInvoice({ ...domestic, documentType: 'TD04' })).toContain('credit/debit notes must reference the corrected invoice');
  });

  it('rejects notes that exceed 200 characters after sanitization (199 chars + € expanding to 202)', () => {
    expect(validateInvoice({ ...domestic, notes: ['a'.repeat(199) + '€'] })).toContain('each note (Causale) must be at most 200 characters');
  });
});

describe('buildInvoiceXml', () => {
  it('produces the flat-rate elements in schema order', () => {
    const xml = buildInvoiceXml(domestic);
    expect(xml).toContain('<RegimeFiscale>RF19</RegimeFiscale>');
    expect(xml).toContain('<Natura>N2.2</Natura>');
    expect(xml).toContain('<BolloVirtuale>SI</BolloVirtuale>');
    expect(xml).toContain('<TipoCassa>TC22</TipoCassa>');
    expect(xml).toContain('<ImportoTotaleDocumento>834.00</ImportoTotaleDocumento>');
    expect(xml).toContain('<ImponibileImporto>832.00</ImponibileImporto>');
    expect(xml.indexOf('<DatiBollo>')).toBeLessThan(xml.indexOf('<DatiCassaPrevidenziale>'));
    expect(xml.indexOf('<DatiCassaPrevidenziale>')).toBeLessThan(xml.indexOf('<ImportoTotaleDocumento>'));
    expect(xml.match(/<Causale>/g)).toHaveLength(2);
  });

  it('foreign customer: XXXXXXX, N2.1, no province', () => {
    const xml = buildInvoiceXml(foreign);
    expect(xml).toContain('<CodiceDestinatario>XXXXXXX</CodiceDestinatario>');
    expect(xml).toContain('<IdPaese>DE</IdPaese>');
    expect(xml).toContain('<Natura>N2.1</Natura>');
    expect(xml).not.toContain('<PECDestinatario>');
    expect(xml).toContain('<AltriDatiGestionali>');
    expect(xml).toContain('<TipoDato>INVCONT</TipoDato>');
  });

  it('foreign customer without IdCodice is rejected (AdE FAQ)', () => {
    expect(validateInvoice({ ...foreign, customer: { ...foreign.customer, vatNumber: undefined } })).toContain('Foreign customer needs an identifier in vatNumber (IdCodice)');
  });

  it('credit note references the original invoice', () => {
    const xml = buildInvoiceXml({ ...domestic, documentType: 'TD04', number: '2/2026', relatedDocuments: [{ number: '1/2026', date: '2026-09-21' }] });
    expect(xml).toContain('<TipoDocumento>TD04</TipoDocumento>');
    expect(xml).toContain('<DatiFattureCollegate>');
    expect(xml).toContain('<IdDocumento>1/2026</IdDocumento>');
  });

  it.skipIf(!isXmllintAvailable())('validates against the official XSD (xmllint)', () => {
    expect(validateWithXsd(buildInvoiceXml(domestic))).toEqual([]);
    expect(validateWithXsd(buildInvoiceXml(foreign))).toEqual([]);
    // Foreign private customer with a service made in Italy (art. 7-ter par. 1 lett. b): N2.2, no annotation.
    expect(validateWithXsd(buildInvoiceXml({ ...foreign, customer: { ...foreign.customer, businessName: undefined, firstName: 'Hans', lastName: 'Muster', vatNumber: 'X123' }, vatNature: 'N2.2', legalReference: 'Art. 1, commi 54-89, L. 190/2014', notes, lineManagementData: undefined }))).toEqual([]);
    expect(validateWithXsd(buildInvoiceXml({ ...domestic, documentType: 'TD04', relatedDocuments: [{ number: '1/2026' }] }))).toEqual([]);
    // Professional fund contribution (Cassa Forense) instead of the INPS surcharge.
    expect(validateWithXsd(buildInvoiceXml({ ...domestic, socialSecurityFund: { type: 'TC01', ratePct: 4, taxable: 800, amount: 32 } }))).toEqual([]);
    // Payment in installments: TP01 with one DettaglioPagamento per installment, RiBa (MP12).
    expect(validateWithXsd(buildInvoiceXml({ ...domestic, payment: { terms: 'TP01', method: 'MP12', installments: [{ dueDate: '2026-10-31', amount: 278 }, { dueDate: '2026-11-30', amount: 278 }, { dueDate: '2026-12-31', amount: 278 }] } }))).toEqual([]);
  });

  it('writes one DettaglioPagamento per installment, with the method and the IBAN on each', () => {
    const xml = buildInvoiceXml({ ...domestic, payment: { terms: 'TP01', method: 'MP05', iban: 'IT60X0542811101000000123456', installments: [{ dueDate: '2026-10-31', amount: 417 }, { dueDate: '2026-11-30', amount: 417 }] } });
    expect(xml).toContain('<CondizioniPagamento>TP01</CondizioniPagamento>');
    expect(xml.match(/<DettaglioPagamento>/g)).toHaveLength(2);
    expect(xml.match(/<IBAN>IT60X0542811101000000123456<\/IBAN>/g)).toHaveLength(2);
    expect(xml).toContain('<DataScadenzaPagamento>2026-11-30</DataScadenzaPagamento>');
  });
});
