import { describe, expect, it } from 'vitest';
import { buildInvoiceXml } from './builder';
import { parseInvoiceXml } from './parser';
import type { FlatRateInvoice } from './types';

const invoice: FlatRateInvoice = {
  format: 'FPR12',
  transmissionId: '00007',
  recipientCode: '0000000',
  recipientPec: 'cliente@pec.example.it',
  supplier: {
    countryCode: 'IT', vatNumber: '01234567890', fiscalCode: 'RSSMRA80A01H501U', firstName: 'Mario', lastName: 'Rossi', taxRegime: 'RF19',
    address: { street: 'Via Roma 1', postalCode: '00100', city: 'Roma', province: 'RM', country: 'IT' },
  },
  customer: { countryCode: 'IT', vatNumber: '09876543210', businessName: 'ACME S.r.l.', address: { street: 'Via Milano 2', postalCode: '20100', city: 'Milano', province: 'MI', country: 'IT' } },
  documentType: 'TD01',
  number: '7/2026',
  date: '2026-03-10',
  currency: 'EUR',
  vatNature: 'N2.2',
  legalReference: 'Art. 1, commi 54-89, L. 190/2014',
  notes: ['Operazione effettuata in regime forfettario', 'Operazione non soggetta a ritenuta'],
  lines: [{ description: 'Sviluppo', quantity: 2, unit: 'gg', unitPrice: 400, totalPrice: 800 }],
  socialSecurityFund: { type: 'TC22', ratePct: 4, taxable: 800, amount: 32 },
  stampDuty: { amount: 2 },
  payment: { terms: 'TP02', method: 'MP05', installments: [{ dueDate: '2026-04-10', amount: 834 }], iban: 'IT60X0542811101000000123456' },
};

describe('parseInvoiceXml', () => {
  it('round-trips an invoice built by the builder', () => {
    const p = parseInvoiceXml(buildInvoiceXml(invoice));
    expect(p.format).toBe('FPR12');
    expect(p.supplier).toMatchObject({ countryCode: 'IT', vatNumber: '01234567890', fiscalCode: 'RSSMRA80A01H501U', firstName: 'Mario', lastName: 'Rossi', taxRegime: 'RF19' });
    expect(p.customer).toMatchObject({ vatNumber: '09876543210', businessName: 'ACME S.r.l.', city: 'Milano', province: 'MI', country: 'IT' });
    expect(p).toMatchObject({ documentType: 'TD01', number: '7/2026', date: '2026-03-10', currency: 'EUR', documentTotal: 834 });
    expect(p.notes).toHaveLength(2);
    expect(p.stampDuty).toEqual({ virtual: true, amount: 2 });
    expect(p.socialSecurityFunds).toMatchObject([{ type: 'TC22', ratePct: 4, amount: 32, taxable: 800 }]);
    expect(p.lines).toEqual([{ lineNumber: 1, description: 'Sviluppo', quantity: 2, unit: 'gg', unitPrice: 400, totalPrice: 800, vatRatePct: 0, nature: 'N2.2' }]);
    expect(p.summaryNatures).toEqual(['N2.2']);
    expect(p.payments[0]).toMatchObject({ method: 'MP05', dueDate: '2026-04-10', amount: 834 });
  });

  it('keeps the numeric text exactly (no float parsing of Numero or codes)', () => {
    const p = parseInvoiceXml(buildInvoiceXml({ ...invoice, number: '0012', transmissionId: '00012' }));
    expect(p.number).toBe('0012');
    expect(p.transmissionId).toBe('00012');
  });

  it('rejects non-FatturaPA XML', () => {
    expect(() => parseInvoiceXml('<foo/>')).toThrow(/FatturaElettronica/);
  });
});
