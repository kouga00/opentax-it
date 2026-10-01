import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('should hash and verify a valid password', async () => {
    const password = 'SuperSecretPassword123!';
    const hash = await service.hash(password);

    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    const valid = await service.verify(password, hash);
    expect(valid).toBe(true);
  });

  it('should reject an incorrect password', async () => {
    const hash = await service.hash('correct-password');
    const valid = await service.verify('wrong-password', hash);
    expect(valid).toBe(false);
  });

  it('should reject malformed hashes gracefully', async () => {
    expect(await service.verify('pass', '')).toBe(false);
    expect(await service.verify('pass', 'invalid$hash')).toBe(false);
    expect(await service.verify('pass', 'bcrypt$10$abc$def')).toBe(false);
    expect(await service.verify('pass', 'scrypt$invalid$8$1$abc$def')).toBe(false);
  });
});
