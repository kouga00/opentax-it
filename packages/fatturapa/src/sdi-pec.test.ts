import { describe, expect, it } from 'vitest';
import { OTHER_PEC_PROVIDER, PEC_PROVIDERS, pecProvider } from './sdi-pec.js';

describe('PEC providers', () => {
  it('have unique ids, distinct from the manual entry', () => {
    const ids = PEC_PROVIDERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(OTHER_PEC_PROVIDER);
  });

  it('use implicit TLS ports and cite an https source with the day it was read', () => {
    for (const p of PEC_PROVIDERS) {
      expect([p.smtpPort, p.imapPort]).toEqual([465, 993]);
      expect(p.sourceUrl).toMatch(/^https:\/\//);
      expect(p.verifiedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('finds a preset by id', () => {
    expect(pecProvider('aruba')?.smtpHost).toBe('smtps.pec.aruba.it');
    expect(pecProvider(OTHER_PEC_PROVIDER)).toBeUndefined();
  });
});
