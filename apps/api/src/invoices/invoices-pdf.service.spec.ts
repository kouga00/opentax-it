import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { InvoicesPdfService } from './invoices-pdf.service.js';
import type { CourtesyInvoice } from './types/courtesy-invoice.js';

describe('InvoicesPdfService', () => {
  const service = new InvoicesPdfService();

  const mockData: CourtesyInvoice = {
    id: 'cmucdvj7a000ao6c4bou7qexj',
    documentType: 'TD01',
    number: '1/2026',
    date: '2026-09-22',
    currency: 'EUR',
    isDraft: false,
    status: 'ISSUED',
    supplier: {
      name: 'Mario Rossi',
      taxRegime: 'RF19',
      vatNumber: '01234567890',
      fiscalCode: 'RSSMRA80A01H501U',
      address: 'Via Roma 10',
      postalCode: '00100',
      city: 'Roma',
      province: 'RM',
      country: 'IT',
      pec: 'mario.rossi@pec.it',
    },
    customer: {
      name: 'Acme Solutions S.r.l.',
      vatNumber: '09876543210',
      fiscalCode: '09876543210',
      address: 'Via Montenapoleone 1',
      postalCode: '20121',
      city: 'Milano',
      province: 'MI',
      country: 'IT',
      recipientCode: 'M5UXCR1',
      pec: 'acme@pec.it',
    },
    lines: [
      {
        lineNumber: 1,
        description: 'Consulenza sviluppo software e architettura cloud\nSeconda riga descrizione',
        quantity: 20,
        unit: 'ore',
        unitPrice: 50,
        totalPrice: 1000,
        vatRatePct: 0,
        vatNature: 'N2.2',
      },
    ],
    taxableAmount: 1000,
    inpsSurcharge: 40,
    inpsRatePct: 4,
    vatAmount: 0,
    virtualStamp: true,
    stampAmount: 2,
    total: 1042,
    payment: {
      dueDate: '2026-10-22',
      method: 'MP05',
      iban: 'IT60X0542811101000000123456',
      bic: 'UNCRITM1XXX',
    },
    notes: [
      "Operazione effettuata in regime forfettario ai sensi dell'articolo 1, commi da 54 a 89, della Legge n. 190/2014 e successive modificazioni",
      "Operazione non soggetta a ritenuta alla fonte a titolo di acconto ai sensi dell'articolo 1, comma 67, Legge n. 190 del 2014 e successive modificazioni",
    ],
  };

  it('generates a valid PDF document with header, customer, lines, totals, and notes', async () => {
    const pdfBytes = await service.generate(mockData);

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    // Verify it starts with %PDF-
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString('utf8');
    expect(header).toBe('%PDF-');

    // Parse with pdf-lib to ensure valid structure
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('handles draft invoices without number', async () => {
    const draftData: CourtesyInvoice = {
      ...mockData,
      number: '',
      isDraft: true,
      status: 'DRAFT',
    };

    const pdfBytes = await service.generate(draftData);
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it('handles long text wrapping and words wider than column without crashing', async () => {
    const dataWithLongWord: CourtesyInvoice = {
      ...mockData,
      lines: [
        {
          lineNumber: 1,
          description: 'Descrizione con riga molto lunga e parola lunghissima: ' + 'A'.repeat(100) + '\nAltra riga',
          quantity: 1,
          unitPrice: 100,
          totalPrice: 100,
          vatRatePct: 0,
          vatNature: 'N2.2',
        },
      ],
      payment: {
        method: 'MP05',
        iban: 'IT' + '9'.repeat(50),
      },
    };

    const pdfBytes = await service.generate(dataWithLongWord);
    expect(pdfBytes.length).toBeGreaterThan(1000);
    const doc = await PDFDocument.load(pdfBytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});
