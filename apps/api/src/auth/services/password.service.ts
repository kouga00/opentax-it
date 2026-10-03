import { Injectable, type OnModuleInit } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/** Password length accepted when an account is created or its password changed (OWASP Authentication Cheat Sheet: at least 8). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

const SALT_BYTES = 16;
const KEY_LEN = 64;
const SCRYPT_OPTIONS: ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
};

function scryptAsync(
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options?: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const cb = (err: Error | null, derivedKey: Buffer) => {
      if (err) reject(err);
      else resolve(derivedKey);
    };

    if (options) {
      scrypt(password, salt, keylen, options, cb);
    } else {
      scrypt(password, salt, keylen, cb);
    }
  });
}

@Injectable()
export class PasswordService implements OnModuleInit {
  /**
   * Hash of a random password, made with the same parameters as the real ones: a login with an unknown email is
   * verified against it, so it takes as long as one with a known email and does not reveal who is registered
   * (OWASP Authentication Cheat Sheet). Not a secret and not configuration: it is regenerated at every start.
   */
  private dummyHash?: Promise<string>;

  onModuleInit() {
    this.dummyHash = this.hash(randomBytes(32).toString('hex'));
  }

  /** Spends the time of a real verification, for an email with no account. */
  async verifyDummy(password: string): Promise<void> {
    this.dummyHash ??= this.hash(randomBytes(32).toString('hex'));
    await this.verify(password, await this.dummyHash);
  }

  /**
   * Hashes a password using scrypt with a random salt.
   * Format: scrypt$16384$8$1$<saltHex>$<derivedKeyHex>
   */
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const derivedKey = await scryptAsync(password, salt, KEY_LEN, SCRYPT_OPTIONS);
    return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
  }

  /**
   * Verifies a password against a hash using constant-time comparison.
   */
  async verify(password: string, storedHash: string): Promise<boolean> {
    const parts = storedHash.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') {
      return false;
    }

    const N = Number.parseInt(parts[1], 10);
    const r = Number.parseInt(parts[2], 10);
    const p = Number.parseInt(parts[3], 10);
    const salt = Buffer.from(parts[4], 'hex');
    const expectedKey = Buffer.from(parts[5], 'hex');

    if (Number.isNaN(N) || Number.isNaN(r) || Number.isNaN(p) || salt.length !== SALT_BYTES) {
      return false;
    }

    try {
      const derivedKey = await scryptAsync(password, salt, expectedKey.length, {
        N,
        r,
        p,
      });

      return (
        derivedKey.length === expectedKey.length &&
        timingSafeEqual(derivedKey, expectedKey)
      );
    } catch {
      return false;
    }
  }
}
