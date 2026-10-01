import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decryptSecret, encryptionConfigured, encryptSecret, MissingEncryptionKeyError } from './secret-cipher.js';

describe('secret cipher', () => {
  const previous = process.env.APP_ENCRYPTION_KEY;
  beforeEach(() => { process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64'); });
  afterEach(() => { process.env.APP_ENCRYPTION_KEY = previous; });

  it('round-trips a secret without storing it in clear', () => {
    const stored = encryptSecret('pàssword segreta');
    expect(stored).not.toContain('segreta');
    expect(stored.startsWith('v1.')).toBe(true);
    expect(decryptSecret(stored)).toBe('pàssword segreta');
  });

  it('uses a new nonce every time', () => {
    expect(encryptSecret('x')).not.toBe(encryptSecret('x'));
  });

  it('refuses a tampered value', () => {
    const [v, iv, tag, data] = encryptSecret('secret').split('.');
    const flipped = Buffer.from(data, 'base64');
    flipped[0] ^= 1;
    expect(() => decryptSecret([v, iv, tag, flipped.toString('base64')].join('.'))).toThrow();
  });

  it('refuses a value encrypted with another key', () => {
    const stored = encryptSecret('secret');
    process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    expect(() => decryptSecret(stored)).toThrow();
  });

  it('requires a 32-byte key', () => {
    process.env.APP_ENCRYPTION_KEY = '';
    expect(encryptionConfigured()).toBe(false);
    expect(() => encryptSecret('x')).toThrow(MissingEncryptionKeyError);
    process.env.APP_ENCRYPTION_KEY = randomBytes(16).toString('base64');
    expect(encryptionConfigured()).toBe(false);
  });
});
