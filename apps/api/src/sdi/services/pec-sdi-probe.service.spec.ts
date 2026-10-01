import { BadGatewayException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { providerReceipt, sdiCourtesyMessage } from '../../../test/fixtures/pec-messages.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { PecImapService } from './pec-imap.service.js';
import { PecSdiProbeService } from './pec-sdi-probe.service.js';
import type { PecSettingsService } from './pec-settings.service.js';
import type { PecSmtpService } from './pec-smtp.service.js';

const CONNECTION = { address: 'mario@pec.example.it', username: 'mario@pec.example.it', password: 'x', smtpHost: 'smtp', smtpPort: 465, imapHost: 'imap', imapPort: 993 };

function setup(opts: { state?: Record<string, unknown>; messages?: Buffer[]; smtpError?: unknown; imapError?: unknown } = {}) {
  const state: Record<string, unknown> = { tenantId: 't1', ...opts.state };
  const prisma = {
    pecMailboxState: {
      upsert: vi.fn().mockResolvedValue(state),
      findUnique: vi.fn().mockResolvedValue(state),
      update: vi.fn(({ data }: { data: object }) => Promise.resolve(Object.assign(state, data))),
    },
  } as unknown as PrismaService;
  const settings = { connection: vi.fn().mockResolvedValue(CONNECTION), get: vi.fn().mockResolvedValue({ recipient: 'sdi01@pec.fatturapa.it' }) } as unknown as PecSettingsService;
  const send = opts.smtpError ? vi.fn().mockRejectedValue(opts.smtpError) : vi.fn().mockResolvedValue(undefined);
  const readInbox = vi.fn(async (_c: unknown, _cursor: unknown, handle: (m: { uidValidity: bigint; uid: bigint; source: Buffer }) => Promise<void>) => {
    if (opts.imapError) throw opts.imapError;
    let uid = 1n;
    for (const source of opts.messages ?? []) await handle({ uidValidity: 1n, uid: uid++, source });
    return { uidValidity: 1n, lastUid: uid };
  });
  const service = new PecSdiProbeService(prisma, settings, { send } as unknown as PecSmtpService, { readInbox } as unknown as PecImapService);
  return { service, state, send, readInbox };
}

describe('PecSdiProbeService (Spec. 1.9.1 §1.3.1, messaggio di cortesia)', () => {
  it('sends a PEC without attachment to the SDI address and remembers its Message-ID', async () => {
    const { service, send, state } = setup();
    const status = await service.send('t1');
    expect(send).toHaveBeenCalledWith(CONNECTION, expect.objectContaining({ to: 'sdi01@pec.fatturapa.it', subject: 'Prova del canale PEC' }));
    expect(send.mock.calls[0][1].attachment).toBeUndefined();
    expect(state.probeMessageId).toBe(send.mock.calls[0][1].messageId);
    expect(status).toMatchObject({ recipient: 'sdi01@pec.fatturapa.it' });
  });

  it('explains an SMTP failure', async () => {
    await expect(setup({ smtpError: Object.assign(new Error('x'), { code: 'EAUTH' }) }).service.send('t1')).rejects.toThrow(BadGatewayException);
  });

  it('reports acceptance, delivery and the SDI reply to this test only', async () => {
    const sentAt = new Date(Date.now() - 5 * 60_000);
    const messages = [
      await providerReceipt('accettazione', 'probe@pec.example.it', 'Prova del canale PEC'),
      await providerReceipt('avvenuta-consegna', 'probe@pec.example.it', 'Prova del canale PEC'),
      await providerReceipt('accettazione', 'other@pec.example.it', 'Altro'),
      await sdiCourtesyMessage(),
    ];
    const { service, readInbox } = setup({ state: { probeMessageId: 'probe@pec.example.it', probeSentAt: sentAt, probeRecipient: 'sdi01@pec.fatturapa.it' }, messages });
    const status = await service.status('t1');
    expect(readInbox.mock.calls[0][1]).toEqual({ since: new Date(Date.UTC(sentAt.getUTCFullYear(), sentAt.getUTCMonth(), sentAt.getUTCDate())) });
    expect(status.acceptedAt).toBeInstanceOf(Date);
    expect(status.deliveredAt).toBeInstanceOf(Date);
    expect(status.sdiReply).toMatchObject({ from: 'sdi01@pec.fatturapa.it', subject: 'Messaggio di cortesia' });
  });

  it('reports a delivery error of the provider', async () => {
    const { service } = setup({ state: { probeMessageId: 'probe@pec.example.it', probeSentAt: new Date() }, messages: [await providerReceipt('errore-consegna', 'probe@pec.example.it')] });
    expect((await service.status('t1')).providerError).toBe('Il messaggio non è stato consegnato alla casella dello SDI.');
  });

  it('without a test does not open the mailbox, and explains an IMAP failure', async () => {
    const none = setup();
    expect(await none.service.status('t1')).toEqual({ sentAt: null, recipient: null });
    expect(none.readInbox).not.toHaveBeenCalled();
    const failing = setup({ state: { probeMessageId: 'p', probeSentAt: new Date() }, imapError: Object.assign(new Error('x'), { code: 'ETIMEDOUT' }) });
    await expect(failing.service.status('t1')).rejects.toThrow('Lettura della casella non riuscita');
  });
});
