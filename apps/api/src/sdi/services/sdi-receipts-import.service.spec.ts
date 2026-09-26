import { describe, expect, it, vi } from 'vitest';
import { officialReceipt } from '../../../test/fixtures/pec-messages.js';
import type { InvoicesService } from '../../invoices/services/invoices.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { SdiReceiptsImportService } from './sdi-receipts-import.service.js';
import type { SdiReceiptsService } from './sdi-receipts.service.js';

// The official examples refer to IT01234567890_11111.xml.p7m.
const entry = (fileName: string) => ({ name: `portale.zip/${fileName}`, fileName, xml: officialReceipt(fileName).toString('utf8') });

function setup(opts: { invoice?: boolean; transmission?: boolean; recorded?: boolean; outcome?: string } = {}) {
  const invoice = { id: 'inv1', number: '12/2026', tenantId: 't1' };
  const created = { id: 'tr-new', fileName: 'IT01234567890_11111.xml.p7m' };
  const prisma = {
    sdiTransmission: {
      findFirst: vi.fn().mockResolvedValue(opts.transmission || opts.outcome ? { id: 'tr1', fileName: 'IT01234567890_11111.xml.p7m', status: opts.outcome ?? 'SENT' } : null),
      create: vi.fn().mockResolvedValue(created),
    },
    sdiNotification: { findFirst: vi.fn().mockResolvedValue(opts.recorded ? { id: 'n1' } : null) },
  };
  const invoices = { findByXmlFileName: vi.fn().mockResolvedValue(opts.invoice === false ? null : invoice) } as unknown as InvoicesService;
  const applySdiReceipt = vi.fn().mockResolvedValue(true);
  const service = new SdiReceiptsImportService(prisma as unknown as PrismaService, invoices, { applySdiReceipt } as unknown as SdiReceiptsService);
  return { service, prisma, applySdiReceipt };
}

describe('SdiReceiptsImportService', () => {
  it('previews a receipt with the invoice it refers to (by NomeFile), writing nothing', async () => {
    const { service, applySdiReceipt } = setup();
    const [row] = await service.preview('t1', [entry('IT01234567890_11111_RC_001.xml')]);
    expect(row).toMatchObject({ kind: 'SDI_RECEIPT', status: 'NEW', documentType: 'RC', number: '12/2026', invoiceId: 'inv1', message: 'Ricevuta di consegna della fattura 12/2026' });
    expect(applySdiReceipt).not.toHaveBeenCalled();
  });

  it('records the outcome of an invoice sent with another tool on a new transmission with channel OTHER', async () => {
    const { service, prisma, applySdiReceipt } = setup();
    const [result] = await service.importEntries('t1', [entry('IT01234567890_11111_NS_001.xml')]);
    expect(prisma.sdiTransmission.create).toHaveBeenCalledWith({ data: { invoiceId: 'inv1', channel: 'OTHER', fileName: 'IT01234567890_11111.xml.p7m', status: 'SENT' } });
    expect(applySdiReceipt).toHaveBeenCalledWith('t1', { id: 'tr-new', fileName: 'IT01234567890_11111.xml.p7m' }, 'IT01234567890_11111_NS_001.xml', expect.any(Buffer), expect.objectContaining({ type: 'NS' }));
    expect(result).toMatchObject({ status: 'IMPORTED', message: 'Ricevuta di scarto' });
  });

  it('uses the existing transmission of an invoice sent from here', async () => {
    const { service, prisma, applySdiReceipt } = setup({ transmission: true });
    await service.importEntries('t1', [entry('IT01234567890_11111_MC_001.xml')]);
    expect(prisma.sdiTransmission.create).not.toHaveBeenCalled();
    expect(applySdiReceipt.mock.calls[0][1]).toEqual({ id: 'tr1', fileName: 'IT01234567890_11111.xml.p7m', status: 'SENT' });
  });

  it('skips a receipt already recorded, and one repeated in the same upload', async () => {
    expect((await setup({ recorded: true }).service.importEntries('t1', [entry('IT01234567890_11111_RC_001.xml')]))[0].status).toBe('SKIPPED');
    const { service, applySdiReceipt } = setup();
    const results = await service.importEntries('t1', [entry('IT01234567890_11111_RC_001.xml'), entry('IT01234567890_11111_RC_001.xml')]);
    expect(results.map((r) => r.status)).toEqual(['IMPORTED', 'SKIPPED']);
    expect(applySdiReceipt).toHaveBeenCalledTimes(1);
  });

  it('explains when no invoice has the file of the receipt, or the receipt is incomplete', async () => {
    const [row] = await setup({ invoice: false }).service.preview('t1', [entry('IT01234567890_11111_RC_001.xml')]);
    expect(row).toMatchObject({ status: 'ERROR', message: 'Nessuna fattura con il file IT01234567890_11111.xml.p7m: importa prima la fattura' });
    const [bad] = await setup().service.preview('t1', [{ name: 'x.xml', fileName: 'x.xml', xml: '<RicevutaConsegna><NomeFile>a.xml</NomeFile></RicevutaConsegna>' }]);
    expect(bad).toMatchObject({ status: 'ERROR', message: 'Ricevuta SDI incompleta o non leggibile' });
  });

  it('in the preview, a receipt of an invoice imported by the same upload is importable', async () => {
    const { service } = setup({ invoice: false });
    const context = { upcomingInvoices: new Map([['IT01234567890_11111.xml.p7m', { number: '101/2026' }]]) };
    const [row] = await service.preview('t1', [entry('IT01234567890_11111_RC_001.xml')], context);
    expect(row).toMatchObject({ status: 'NEW', documentType: 'RC', number: '101/2026', message: 'Ricevuta di consegna della fattura 101/2026, importata insieme' });
  });

  it('refuses a receipt with a different outcome from the one SDI already gave, and skips the same outcome', async () => {
    const [row] = await setup({ outcome: 'SDI_DELIVERED' }).service.preview('t1', [entry('IT01234567890_11111_NS_001.xml')]);
    expect(row).toMatchObject({ status: 'ERROR', message: 'Esito in conflitto: per questo file lo SDI ha già dato ricevuta di consegna. Ricevuta non registrata' });
    const [same] = await setup({ outcome: 'SDI_DELIVERED' }).service.importEntries('t1', [entry('IT01234567890_11111_RC_001.xml')]);
    expect(same.status).toBe('SKIPPED');
  });
});
