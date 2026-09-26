import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { StorageService } from '../../storage/storage.service.js';
import { InvoiceStatusService } from '../../invoices/services/invoice-status.service.js';
import { ordinaryMail, providerReceipt, sdiEnvelope } from '../../../test/fixtures/pec-messages.js';
import { SdiReceiptsService } from './sdi-receipts.service.js';

// The official receipt examples refer to the file IT01234567890_11111.xml.p7m.
const FILE = 'IT01234567890_11111.xml.p7m';

type Row = Record<string, unknown>;

/** In-memory stand-in for the few Prisma calls the service makes, with the unique key on notifications. */
function setup(transmission: Row = {}, profile: Row = {}) {
  const t: Row = { id: 't1', invoiceId: 'inv1', fileName: FILE, pecMessageId: 'abc@opentax.local', status: 'SENT', sentAt: new Date('2026-09-26T10:00:00Z'), ...transmission };
  const invoice: Row = { id: 'inv1', tenantId: 'tenant1', status: 'SENT' };
  const prof: Row = { tenantId: 'tenant1', sdiPecAssigned: null, ...profile };
  const notifications: Row[] = [];
  const match = (where: Row) =>
    (where.invoice as Row).tenantId === invoice.tenantId &&
    (where.pecMessageId === undefined || where.pecMessageId === t.pecMessageId) &&
    (where.fileName === undefined || where.fileName === t.fileName);
  const prisma = {
    sdiTransmission: {
      findFirst: vi.fn(({ where }: { where: Row }) => Promise.resolve(match(where) ? { ...t } : null)),
      update: vi.fn(({ data }: { data: Row }) => Promise.resolve(Object.assign(t, data))),
    },
    sdiNotification: {
      create: vi.fn(({ data }: { data: Row }) => {
        if (notifications.some((n) => n.transmissionId === data.transmissionId && n.dedupeKey === data.dedupeKey)) {
          return Promise.reject(new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' }));
        }
        notifications.push(data);
        return Promise.resolve(data);
      }),
    },
    invoice: {
      updateMany: vi.fn(({ where, data }: { where: Row; data: Row }) => {
        const statusOk = where.status === undefined || (typeof where.status === 'string' ? where.status === invoice.status : (where.status as Row).not !== invoice.status);
        if (where.id === invoice.id && where.tenantId === invoice.tenantId && statusOk) Object.assign(invoice, data);
        return Promise.resolve({ count: 1 });
      }),
    },
    tenantProfile: {
      updateMany: vi.fn(({ where, data }: { where: Row; data: Row }) => {
        if (where.tenantId === prof.tenantId && prof.sdiPecAssigned === null) Object.assign(prof, data);
        return Promise.resolve({ count: 1 });
      }),
    },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
  };
  const write = vi.fn((path: string) => Promise.resolve(path));
  const service = new SdiReceiptsService(prisma as unknown as PrismaService, { write } as unknown as StorageService, new InvoiceStatusService());
  return { service, t, invoice, prof, notifications, write };
}

describe('SdiReceiptsService.apply', () => {
  it('delivery receipt (RC): transmission and invoice delivered, SDI id saved, receipt stored', async () => {
    const { service, t, invoice, notifications, write } = setup();
    expect(await service.apply('tenant1', await sdiEnvelope('sdi27@pec.fatturapa.it'))).toBe(true);
    expect(t).toMatchObject({ status: 'SDI_DELIVERED', sdiId: '111' });
    expect(invoice.status).toBe('DELIVERED');
    expect(notifications).toMatchObject([{ type: 'RC', sdiId: '111', dedupeKey: 'sdi:RC:111:123456' }]);
    expect(write).toHaveBeenCalledWith('tenant1/sdi/receipts/IT01234567890_11111_RC_001.xml', expect.any(Buffer));
  });

  it('rejection (NS): invoice rejected with the SDI error codes', async () => {
    const { service, t, invoice } = setup();
    await service.apply('tenant1', await sdiEnvelope('sdi27@pec.fatturapa.it', 'IT01234567890_11111_NS_001.xml'));
    expect(t).toMatchObject({ status: 'SDI_REJECTED', lastError: '00100 Certificato di firma scaduto' });
    expect(invoice.status).toBe('REJECTED');
  });

  it('failed delivery (MC): invoice made available, not delivered', async () => {
    const { service, t, invoice } = setup();
    await service.apply('tenant1', await sdiEnvelope('sdi27@pec.fatturapa.it', 'IT01234567890_11111_MC_001.xml'));
    expect(t.status).toBe('SDI_NOT_DELIVERED');
    expect(invoice.status).toBe('NOT_DELIVERED');
  });

  it('the same receipt read twice (after a restart) is recorded once', async () => {
    const { service, notifications } = setup();
    const message = await sdiEnvelope('sdi27@pec.fatturapa.it');
    await service.apply('tenant1', message);
    await service.apply('tenant1', message);
    expect(notifications).toHaveLength(1);
  });

  it('learns the address assigned by SDI from the certified sender, only once (Allegato B 1.8.4 §3.1.1)', async () => {
    const { service, prof } = setup();
    await service.apply('tenant1', await sdiEnvelope('sdi27@pec.fatturapa.it'));
    expect(prof.sdiPecAssigned).toBe('sdi27@pec.fatturapa.it');
    const already = setup({}, { sdiPecAssigned: 'sdi05@pec.fatturapa.it' });
    await already.service.apply('tenant1', await sdiEnvelope('sdi27@pec.fatturapa.it'));
    expect(already.prof.sdiPecAssigned).toBe('sdi05@pec.fatturapa.it');
  });

  it('ignores receipts for files of other tenants or other tools, and does not learn an address from them', async () => {
    const { service, prof, notifications } = setup({ fileName: 'IT09876543210_00001.xml' });
    expect(await service.apply('tenant1', await sdiEnvelope('sdi27@pec.fatturapa.it'))).toBe(false);
    expect(notifications).toHaveLength(0);
    expect(prof.sdiPecAssigned).toBeNull();
  });

  it('provider acceptance closes a transmission left PENDING by a stop right after sending', async () => {
    const { service, t } = setup({ status: 'PENDING', sentAt: null });
    expect(await service.apply('tenant1', await providerReceipt('accettazione', 'abc@opentax.local'))).toBe(true);
    expect(t).toMatchObject({ status: 'ACCEPTED_BY_PEC', pecProviderId: 'opec-1@pec.example.it' });
    expect(t.sentAt).toBeInstanceOf(Date);
  });

  it('provider delivery error: the file never reached SDI, the invoice can be sent again', async () => {
    const { service, t, invoice } = setup();
    await service.apply('tenant1', await providerReceipt('errore-consegna', 'abc@opentax.local'));
    expect(t).toMatchObject({ status: 'ERROR', lastError: 'Il messaggio non è stato consegnato alla casella dello SDI.' });
    expect(invoice.status).toBe('ISSUED');
  });

  it('a late provider receipt does not override the SDI outcome', async () => {
    const { service, t, invoice } = setup();
    await service.apply('tenant1', await sdiEnvelope('sdi27@pec.fatturapa.it'));
    await service.apply('tenant1', await providerReceipt('accettazione', 'abc@opentax.local'));
    expect(t.status).toBe('SDI_DELIVERED');
    expect(invoice.status).toBe('DELIVERED');
  });

  it('ignores ordinary mail', async () => {
    const { service, notifications } = setup();
    expect(await service.apply('tenant1', await ordinaryMail())).toBe(false);
    expect(notifications).toHaveLength(0);
  });
});
