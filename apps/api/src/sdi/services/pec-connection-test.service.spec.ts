import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { PecTestEvent } from '../types/pec-test-event.js';
import { PecConnectionTestService } from './pec-connection-test.service.js';
import type { PecImapService } from './pec-imap.service.js';
import type { PecSettingsService } from './pec-settings.service.js';
import type { PecSmtpService } from './pec-smtp.service.js';

const CONNECTION = { address: 'mario@pec.it', username: 'mario@pec.it', password: 'x', smtpHost: 'smtps.pec.aruba.it', smtpPort: 465, imapHost: 'imaps.pec.aruba.it', imapPort: 993 };

function setup(opts: { connection?: unknown; smtpOpen?: unknown; smtpLogin?: unknown; imap?: unknown } = {}) {
  const settings = { connection: opts.connection ? vi.fn().mockRejectedValue(opts.connection) : vi.fn().mockResolvedValue(CONNECTION) } as unknown as PecSettingsService;
  const close = vi.fn();
  const session = { login: opts.smtpLogin ? vi.fn().mockRejectedValue(opts.smtpLogin) : vi.fn().mockResolvedValue(undefined), close };
  const smtp = { open: opts.smtpOpen ? vi.fn().mockRejectedValue(opts.smtpOpen) : vi.fn().mockResolvedValue(session) } as unknown as PecSmtpService;
  const imap = { login: opts.imap ? vi.fn().mockRejectedValue(opts.imap) : vi.fn().mockResolvedValue(undefined) } as unknown as PecImapService;
  return { service: new PecConnectionTestService(settings, smtp, imap), close };
}

async function run(service: PecConnectionTestService) {
  const events: PecTestEvent[] = [];
  for await (const e of service.run('t1')) events.push(e);
  return events.filter((e) => e.kind === 'done' || e.status !== 'RUNNING').map((e) => (e.kind === 'step' ? `${e.step}:${e.status}` : `done:${e.ok}`));
}

describe('PecConnectionTestService', () => {
  it('reports each step, then that the mailbox is ready', async () => {
    const { service, close } = setup();
    expect(await run(service)).toEqual(['SMTP_CONNECT:OK', 'SMTP_LOGIN:OK', 'IMAP_CONNECT:OK', 'IMAP_LOGIN:OK', 'done:true']);
    expect(close).toHaveBeenCalled();
  });

  it('a rejected login: the connection worked, the login failed', async () => {
    const auth = Object.assign(new Error('535'), { code: 'EAUTH' });
    const imapAuth = Object.assign(new Error('NO'), { authenticationFailed: true });
    expect(await run(setup({ smtpLogin: auth, imap: imapAuth }).service)).toEqual(['SMTP_CONNECT:OK', 'SMTP_LOGIN:FAILED', 'IMAP_CONNECT:OK', 'IMAP_LOGIN:FAILED', 'done:false']);
  });

  it('an unreachable server skips its login and still tests the other server', async () => {
    const dns = Object.assign(new Error('x'), { code: 'EDNS' });
    expect(await run(setup({ smtpOpen: dns }).service)).toEqual(['SMTP_CONNECT:FAILED', 'SMTP_LOGIN:SKIPPED', 'IMAP_CONNECT:OK', 'IMAP_LOGIN:OK', 'done:false']);
  });

  it('ends with the reason when the mailbox is not configured, instead of an HTTP error', async () => {
    const events = [];
    for await (const e of setup({ connection: new BadRequestException('Configura la casella PEC') }).service.run('t1')) events.push(e);
    expect(events).toEqual([{ kind: 'done', ok: false, message: 'Configura la casella PEC' }]);
  });
});
