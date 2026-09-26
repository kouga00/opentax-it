import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decryptSecret, encryptSecret } from '../../common/secret-cipher.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { PecSettingsService } from './pec-settings.service.js';

function setup(profile: Record<string, unknown> = {}) {
  let stored: Record<string, unknown> = { tenantId: 't1', pecProvider: null, pecAddress: null, pecUsername: null, pecSmtpHost: null, pecSmtpPort: null, pecImapHost: null, pecImapPort: null, pecPasswordEnc: null, sdiPecAssigned: null, ...profile };
  const update = vi.fn().mockImplementation(({ data }: { data: object }) => { stored = { ...stored, ...data }; return Promise.resolve(stored); });
  const prisma = { pecMailboxState: { findUnique: vi.fn().mockResolvedValue(null) }, tenantProfile: { findUnique: vi.fn().mockImplementation(() => Promise.resolve(stored)), update } } as unknown as PrismaService;
  return { service: new PecSettingsService(prisma), update, stored: () => stored };
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
});
