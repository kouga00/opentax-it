import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decryptSecret, encryptSecret } from '../../common/secret-cipher.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { PecMailerService } from './pec-mailer.service.js';
import { PecSettingsService } from './pec-settings.service.js';

function setup(profile: Record<string, unknown> = {}) {
  let stored: Record<string, unknown> = { tenantId: 't1', pecProvider: null, pecAddress: null, pecUsername: null, pecSmtpHost: null, pecSmtpPort: null, pecImapHost: null, pecImapPort: null, pecPasswordEnc: null, sdiPecAssigned: null, ...profile };
  const update = vi.fn().mockImplementation(({ data }: { data: object }) => { stored = { ...stored, ...data }; return Promise.resolve(stored); });
  const prisma = { tenantProfile: { findUnique: vi.fn().mockImplementation(() => Promise.resolve(stored)), update } } as unknown as PrismaService;
  const mailer = {
    testSmtp: vi.fn(async function* () {
      yield { kind: 'step', step: 'SMTP_CONNECT', status: 'OK' };
      yield { kind: 'step', step: 'SMTP_LOGIN', status: 'FAILED', message: 'rifiutato' };
    }),
    testImap: vi.fn(async function* () {
      yield { kind: 'step', step: 'IMAP_CONNECT', status: 'OK' };
      yield { kind: 'step', step: 'IMAP_LOGIN', status: 'OK' };
    }),
  } as unknown as PecMailerService;
  return { service: new PecSettingsService(prisma, mailer), update, stored: () => stored };
}

describe('PecSettingsService', () => {
  const previous = process.env.APP_ENCRYPTION_KEY;
  beforeEach(() => { process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64'); });
  afterEach(() => { process.env.APP_ENCRYPTION_KEY = previous; });

  it('stores the password encrypted and never returns it', async () => {
    const { service, stored } = setup();
    const s = await service.save('t1', { provider: 'aruba', address: 'mario@pec.it', password: 'segreta' });
    expect(stored().pecPasswordEnc).not.toContain('segreta');
    expect(decryptSecret(stored().pecPasswordEnc as string)).toBe('segreta');
    expect(s).toMatchObject({ hasPassword: true, smtpHost: 'smtps.pec.aruba.it', smtpPort: 465, imapHost: 'imaps.pec.aruba.it' });
    expect(JSON.stringify(s)).not.toContain('segreta');
  });

  it('keeps the stored password when none is sent', async () => {
    const enc = encryptSecret('vecchia');
    const { service, stored } = setup({ pecPasswordEnc: enc });
    await service.save('t1', { provider: 'aruba', address: 'mario@pec.it' });
    expect(stored().pecPasswordEnc).toBe(enc);
  });

  it('keeps the servers only for a provider entered by hand', async () => {
    const { service, stored } = setup();
    await service.save('t1', { provider: 'aruba', address: 'mario@pec.it', smtpHost: 'evil.example.com', smtpPort: 25 });
    expect(stored().pecSmtpHost).toBeNull();
    await service.save('t1', { provider: 'OTHER', address: 'mario@pec.it', smtpHost: 'smtp.pec.example.it', smtpPort: 465, imapHost: 'imap.pec.example.it', imapPort: 993 });
    expect(await service.get('t1')).toMatchObject({ smtpHost: 'smtp.pec.example.it', imapPort: 993 });
  });

  it('refuses to save a password without APP_ENCRYPTION_KEY', async () => {
    process.env.APP_ENCRYPTION_KEY = '';
    await expect(setup().service.save('t1', { provider: 'aruba', address: 'mario@pec.it', password: 'x' })).rejects.toThrow(BadRequestException);
  });

  it('logs in with the address when there is no separate username', async () => {
    const { service } = setup({ pecProvider: 'aruba', pecAddress: 'mario@pec.it', pecPasswordEnc: encryptSecret('segreta') });
    expect(await service.connection('t1')).toMatchObject({ username: 'mario@pec.it', password: 'segreta', smtpHost: 'smtps.pec.aruba.it' });
  });

  it('asks to configure the mailbox when something is missing, and to re-enter a password encrypted with another key', async () => {
    await expect(setup({ pecProvider: 'aruba', pecAddress: 'mario@pec.it' }).service.connection('t1')).rejects.toThrow('Configura');
    const enc = encryptSecret('segreta');
    process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    await expect(setup({ pecProvider: 'aruba', pecAddress: 'mario@pec.it', pecPasswordEnc: enc }).service.connection('t1')).rejects.toThrow('di nuovo');
  });

  it('streams the SMTP steps, then the IMAP ones, then the overall result', async () => {
    const { service } = setup({ pecProvider: 'aruba', pecAddress: 'mario@pec.it', pecPasswordEnc: encryptSecret('segreta') });
    const events = [];
    for await (const e of service.test('t1')) events.push(e);
    expect(events.map((e) => (e.kind === 'step' ? `${e.step}:${e.status}` : `done:${e.ok}`))).toEqual([
      'SMTP_CONNECT:OK', 'SMTP_LOGIN:FAILED', 'IMAP_CONNECT:OK', 'IMAP_LOGIN:OK', 'done:false',
    ]);
  });

  it('ends the stream with the reason when the mailbox is not configured, instead of an HTTP error', async () => {
    const events = [];
    for await (const e of setup().service.test('t1')) events.push(e);
    expect(events).toEqual([{ kind: 'done', ok: false, message: expect.stringContaining('Configura') }]);
  });
});
