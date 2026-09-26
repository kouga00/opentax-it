import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Encryption at rest of tenant secrets (the PEC password) with AES-256-GCM from node:crypto, which also
 * authenticates the data: a tampered value fails to decrypt instead of returning garbage. The key is
 * APP_ENCRYPTION_KEY, 32 random bytes in base64 (`openssl rand -base64 32`).
 *
 * Stored format: "v1.<iv>.<auth tag>.<ciphertext>", each part in base64.
 */

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';

export class MissingEncryptionKeyError extends Error {
  constructor() {
    super('APP_ENCRYPTION_KEY is missing or is not 32 bytes in base64');
  }
}

function key(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY ?? '';
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) throw new MissingEncryptionKeyError();
  return buf;
}

export const encryptionConfigured = (): boolean => Buffer.from(process.env.APP_ENCRYPTION_KEY ?? '', 'base64').length === 32;

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12); // 96-bit nonce, the size recommended for GCM
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.');
}

export function decryptSecret(stored: string): string {
  const [version, iv, tag, data] = stored.split('.');
  if (version !== VERSION || !iv || !tag || !data) throw new Error('Unknown encrypted secret format');
  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
}
