import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { StorageService } from '../../storage/storage.service.js';
import type { TenantsService } from '../../tenants/tenants.service.js';
import { InvoicesImportService } from './invoices-import.service.js';

// Each test file carries its own document number, which the mocked parser returns.
const file = (name: string, number: string) => ({ name, content: Buffer.from(number) });

vi.mock('@opentax-it/fatturapa', () => ({
  parseInvoiceXml: (xml: string) => ({
    supplier: { countryCode: 'IT', vatNumber: '01234567890' },
    customer: { countryCode: 'IT', vatNumber: '09876543210', businessName: 'Acme' },
    documentType: 'TD01',
    date: '2025-03-01',
    number: xml,
    currency: 'EUR',
    lines: [{ lineNumber: 1, description: 'Consulenza', unitPrice: 100, totalPrice: 100 }],
    summaryNatures: ['N2.2'],
    relatedDocuments: [],
    payments: [{ method: 'MP05', dueDate: '2025-03-31', amount: 100 }],
    notes: [],
  }),
}));

function setup() {
  let n = 0;
  const tx = {
    invoice: {
      create: vi.fn().mockImplementation(() => Promise.resolve({ id: `inv${++n}` })),
      update: vi.fn().mockImplementation(({ where, data }) => Promise.resolve({ id: where.id, ...data })),
    },
  };
  const invoiceFindFirst = vi.fn().mockResolvedValue(null);
  const customerFindFirst = vi.fn().mockResolvedValue({ id: 'cust1', businessName: 'Acme' });
  const prisma = {
    invoice: { findFirst: invoiceFindFirst },
    customer: { findFirst: customerFindFirst },
    $transaction: vi.fn().mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx)),
  } as unknown as PrismaService;
  const storage = { write: vi.fn().mockImplementation((path: string) => Promise.resolve(path)) };
  const getWithProfile = vi.fn().mockResolvedValue({ profile: { vatNumber: '01234567890' } });
  const tenants = { getWithProfile } as unknown as TenantsService;
  const service = new InvoicesImportService(prisma, tenants, storage as unknown as StorageService);
  return { service, storage, tx, invoiceFindFirst, customerFindFirst, getWithProfile };
}

describe('InvoicesImportService.importFiles', () => {
  it('stores two files with the same name at different paths, never overwriting', async () => {
    const { service, storage, tx } = setup();
    const results = await service.importFiles('tenant1', [
      file('fattura.xml', '1/2025'),
      file('fattura.xml', '2/2025'),
    ]);

    expect(results.map((r) => r.status)).toEqual(['IMPORTED', 'IMPORTED']);
    const paths = storage.write.mock.calls.map((c) => c[0]);
    expect(paths).toEqual(['tenant1/invoices/2025/imported/inv1_fattura.xml', 'tenant1/invoices/2025/imported/inv2_fattura.xml']);
    for (const call of storage.write.mock.calls) expect(call[2]).toEqual({ exclusive: true });
    expect(tx.invoice.update).toHaveBeenCalledWith({ where: { id: 'inv1' }, data: { xmlPath: paths[0] } });
    // ModalitaPagamento of the document, so that its collections take it.
    expect(tx.invoice.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ paymentMethod: 'MP05' }) }));
  });

  it('reports an error when the XML cannot be stored, inside the transaction', async () => {
    const { service, storage } = setup();
    storage.write.mockRejectedValueOnce(Object.assign(new Error('EEXIST: file already exists'), { code: 'EEXIST' }));
    const [result] = await service.importFiles('tenant1', [file('fattura.xml', '1/2025')]);
    expect(result.status).toBe('ERROR');
    expect(result.message).toBe('Errore imprevisto durante l\'import di questo file'); // no file system details
  });

  it('rejects a Numero that is not Basic Latin or longer than 20 characters (String20Type)', async () => {
    const { service, storage } = setup();
    const results = await service.importFiles('tenant1', [
      file('a.xml', '1/2025"\r\nX'),
      file('b.xml', '1/2025-ç'),
      file('c.xml', '123456789012345678901'),
    ]);
    expect(results.map((r) => r.status)).toEqual(['ERROR', 'ERROR', 'ERROR']);
    expect(results[0].message).toMatch(/^Numero documento non valido/);
    expect(storage.write).not.toHaveBeenCalled();
  });
});

describe('InvoicesImportService.preview', () => {
  it('reports new, already present and repeated documents and ignored files, writing nothing', async () => {
    const { service, storage, tx, invoiceFindFirst, customerFindFirst } = setup();
    invoiceFindFirst.mockImplementation((args: { where: { number?: string } }) =>
      Promise.resolve(args.where.number === '2/2025' ? { id: 'old', number: '2/2025', sequence: 2 } : null));
    const rows = await service.preview('tenant1', [file('a.xml', '1/2025'), file('b.xml', '2/2025'), file('c.xml', '1/2025'), file('d.pdf', 'x')]);
    expect(rows.map((r) => [r.file, r.status, r.number, r.message])).toEqual([
      ['a.xml', 'NEW', '1/2025', undefined],
      ['b.xml', 'DUPLICATE', '2/2025', 'Già presente'],
      ['c.xml', 'DUPLICATE', '1/2025', 'Compare più volte nei file caricati'],
      ['d.pdf', 'IGNORED', undefined, 'Non è un file XML o ZIP'],
    ]);
    expect(rows[0]).toMatchObject({ documentType: 'TD01', date: '2025-03-01', customer: 'Acme', total: 100 });
    expect(rows[1].invoiceId).toBe('old');
    expect(tx.invoice.create).not.toHaveBeenCalled();
    expect(storage.write).not.toHaveBeenCalled();
    expect(customerFindFirst).not.toHaveBeenCalled();
  });

  it('shows the document data also when a check fails, e.g. another supplier', async () => {
    const { service, getWithProfile } = setup();
    getWithProfile.mockResolvedValue({ profile: { vatNumber: '11111111111' } });
    const [row] = await service.preview('tenant1', [file('a.xml', '1/2025')]);
    expect(row).toMatchObject({ status: 'ERROR', documentType: 'TD01', number: '1/2025', date: '2025-03-01', customer: 'Acme', total: 100 });
    expect(row.message).toBe('Il cedente IT01234567890 non è la partita IVA attiva (11111111111)');
  });

  it('flags two numbers with the same progressive in the same upload', async () => {
    const { service } = setup();
    const rows = await service.preview('tenant1', [file('a.xml', '3/2025'), file('b.xml', 'FPA 3/2025')]);
    expect(rows.map((r) => r.status)).toEqual(['NEW', 'ERROR']);
    expect(rows[1].message).toBe('Progressivo 3/2025 già usato dal documento 3/2025 nei file caricati');
  });
});

describe('InvoicesImportService.importFiles with a selection', () => {
  it('imports only the selected entries', async () => {
    const { service, storage } = setup();
    const results = await service.importFiles('tenant1', [file('a.xml', '1/2025'), file('b.xml', '2/2025')], ['b.xml']);
    expect(results.map((r) => [r.file, r.status])).toEqual([['b.xml', 'IMPORTED']]);
    expect(storage.write).toHaveBeenCalledTimes(1);
  });
});
