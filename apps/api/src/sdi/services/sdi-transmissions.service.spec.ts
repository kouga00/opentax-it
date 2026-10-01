import { BadGatewayException, BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { StorageService } from '../../storage/storage.service.js';
import type { InvoiceStatusService } from '../../invoices/services/invoice-status.service.js';
import type { InvoicesService } from '../../invoices/services/invoices.service.js';
import type { PecSmtpService } from './pec-smtp.service.js';
import type { PecSettingsService } from './pec-settings.service.js';
import { InvoiceStatusService as InvoiceStatusServiceImpl } from '../../invoices/services/invoice-status.service.js';
import { SdiTransmissionsService } from './sdi-transmissions.service.js';

const CONNECTION = { address: 'mario.rossi@pec.example.it', username: 'mario.rossi@pec.example.it', password: 'x', smtpHost: 'smtp.example.it', smtpPort: 465, imapHost: 'imap.example.it', imapPort: 993 };

function setup(opts: { status?: string; xmlPath?: string; imported?: boolean; kind?: string; assigned?: string | null; alreadySent?: number; claimed?: number; sendError?: unknown; movedMeanwhile?: string } = {}) {
  const invoice = { id: 'inv1', tenantId: 't1', status: opts.status ?? 'ISSUED', xmlPath: opts.xmlPath ?? 't1/invoices/2026/IT01234567890_00001.xml', xmlFileName: 'IT01234567890_00001.xml', imported: opts.imported ?? false, customer: { kind: opts.kind ?? 'IT_BUSINESS' } };
  const invoiceUpdateMany = vi.fn().mockResolvedValue({ count: opts.claimed ?? 1 });
  // The stored transmission: a receipt read by the sync may move it forward while the message is being sent.
  const row: Record<string, unknown> = { id: 'tr1', status: 'PENDING', sentAt: null };
  const transmissionUpdate = vi.fn(({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
    const matches = Object.entries(where).every(([k, v]) => row[k] === v);
    if (matches) Object.assign(row, data);
    return Promise.resolve({ count: matches ? 1 : 0 });
  });
  const transmissionCreate = vi.fn((_args: { data: { pecMessageId: string } }) => Promise.resolve({ ...row }));
  const tx = { invoice: { updateMany: invoiceUpdateMany }, sdiTransmission: { create: transmissionCreate, updateMany: transmissionUpdate } };
  const prisma = {
    invoice: { updateMany: invoiceUpdateMany },
    sdiTransmission: { count: vi.fn().mockResolvedValue(opts.alreadySent ?? 0), updateMany: transmissionUpdate, findUniqueOrThrow: vi.fn(() => Promise.resolve({ ...row })) },
    $transaction: vi.fn().mockImplementation((arg: unknown) => (typeof arg === 'function' ? arg(tx) : Promise.all(arg as Promise<unknown>[]))),
  } as unknown as PrismaService;
  const storage = { read: vi.fn().mockResolvedValue(Buffer.from('<xml/>')) } as unknown as StorageService;
  const settings = { connection: vi.fn().mockResolvedValue(CONNECTION), get: vi.fn().mockResolvedValue({ sdiPecAssigned: opts.assigned ?? null, recipient: opts.assigned ?? 'sdi01@pec.fatturapa.it' }) } as unknown as PecSettingsService;
  const send = opts.sendError
    ? vi.fn((_c: unknown, _m: { to: string; messageId: string }) => { if (opts.movedMeanwhile) row.status = opts.movedMeanwhile; return Promise.reject(opts.sendError); })
    : vi.fn((_c: unknown, _m: { to: string; messageId: string }) => { if (opts.movedMeanwhile) row.status = opts.movedMeanwhile; return Promise.resolve(undefined); });
  const smtp = { send } as unknown as PecSmtpService;
  const invoices = { get: vi.fn().mockResolvedValue(invoice) } as unknown as InvoicesService;
  // The real status rules of the invoices module, over the fake transaction.
  const invoiceStatus = new InvoiceStatusServiceImpl();
  return { service: new SdiTransmissionsService(prisma, storage, settings, smtp, invoices, invoiceStatus as unknown as InvoiceStatusService), send, invoiceUpdateMany, transmissionUpdate, transmissionCreate };
}

describe('SdiTransmissionsService.send (spec 1.9.1 §1.3.1)', () => {
  it('sends the XML as attachment to sdi01@pec.fatturapa.it the first time', async () => {
    const { service, send, transmissionUpdate, transmissionCreate } = setup();
    const t = await service.send('t1', 'inv1');
    // Our Message-ID is saved before sending, so that receipts can be matched even after a stop right after it.
    const { pecMessageId } = transmissionCreate.mock.calls[0][0].data;
    expect(pecMessageId).toMatch(/^[0-9a-f-]{36}@pec\.example\.it$/);
    expect(send).toHaveBeenCalledWith(CONNECTION, expect.objectContaining({
      to: 'sdi01@pec.fatturapa.it',
      messageId: pecMessageId,
      attachment: { fileName: 'IT01234567890_00001.xml', content: Buffer.from('<xml/>') },
    }));
    expect(t).toMatchObject({ status: 'SENT' });
    expect(t.sentAt).toBeInstanceOf(Date);
    expect(transmissionUpdate).toHaveBeenCalledWith({ where: { id: 'tr1', status: 'PENDING' }, data: { status: 'SENT', sentAt: expect.any(Date) } });
  });

  it('uses the address assigned by SDI once it is known', async () => {
    const { service, send } = setup({ assigned: 'sdi27@pec.fatturapa.it', alreadySent: 1 });
    await service.send('t1', 'inv1');
    expect(send.mock.calls[0][1].to).toBe('sdi27@pec.fatturapa.it');
  });

  it('asks for the assigned address after the first transmission instead of using sdi01 again', async () => {
    const { service, send } = setup({ alreadySent: 1 });
    await expect(service.send('t1', 'inv1')).rejects.toThrow(BadRequestException);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses imported invoices, drafts and invoices already sent', async () => {
    await expect(setup({ imported: true }).service.send('t1', 'inv1')).rejects.toThrow('importata');
    await expect(setup({ status: 'DRAFT' }).service.send('t1', 'inv1')).rejects.toThrow(BadRequestException);
    await expect(setup({ status: 'SENT' }).service.send('t1', 'inv1')).rejects.toThrow(BadRequestException);
  });

  it('refuses invoices to the public administration, which need a signature', async () => {
    await expect(setup({ kind: 'IT_PA' }).service.send('t1', 'inv1')).rejects.toThrow('firmate');
  });

  it('does not send twice when a concurrent request claimed the invoice first', async () => {
    const { service, send } = setup({ claimed: 0 });
    await expect(service.send('t1', 'inv1')).rejects.toThrow(ConflictException);
    expect(send).not.toHaveBeenCalled();
  });

  it('on an SMTP error records it without internal details and puts the invoice back to issued', async () => {
    const { service, transmissionUpdate, invoiceUpdateMany } = setup({ sendError: Object.assign(new Error('535 5.7.8 internal detail'), { code: 'EAUTH' }) });
    const err = await service.send('t1', 'inv1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BadGatewayException);
    expect((err as Error).message).not.toContain('internal detail');
    expect(transmissionUpdate).toHaveBeenCalledWith({ where: { id: 'tr1', status: 'PENDING' }, data: { status: 'ERROR', lastError: expect.stringContaining('password') } });
    expect(invoiceUpdateMany).toHaveBeenLastCalledWith({ where: { id: 'inv1', tenantId: 't1', xmlFileName: 'IT01234567890_00001.xml', status: 'SENT' }, data: { status: 'ISSUED' } });
  });

  it('does not move a transmission backwards when a receipt was read while sending', async () => {
    const { service } = setup({ movedMeanwhile: 'ACCEPTED_BY_PEC' });
    const t = await service.send('t1', 'inv1');
    expect(t.status).toBe('ACCEPTED_BY_PEC');
    expect(t.sentAt).toBeInstanceOf(Date);
  });
});
