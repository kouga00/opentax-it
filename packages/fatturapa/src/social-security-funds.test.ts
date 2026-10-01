import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { INPS_SOCIAL_SECURITY_FUND, SOCIAL_SECURITY_FUNDS } from './social-security-funds.js';

describe('SOCIAL_SECURITY_FUNDS', () => {
  it('matches TipoCassaType of the FatturaPA schema, code by code', () => {
    const xsd = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas', 'Schema_VFPR12_v1.2.3.xsd'), 'utf8');
    const type = xsd.slice(xsd.indexOf('name="TipoCassaType"'));
    const block = type.slice(0, type.indexOf('</xs:simpleType>'));
    const fromSchema = Object.fromEntries(
      [...block.matchAll(/value="(TC\d+)">\s*<xs:annotation>\s*<xs:documentation>([\s\S]*?)<\/xs:documentation>/g)].map(([, code, doc]) => [code, doc.split(/\s+/).join(' ')]),
    );
    expect(SOCIAL_SECURITY_FUNDS).toEqual(fromSchema);
    expect(SOCIAL_SECURITY_FUNDS[INPS_SOCIAL_SECURITY_FUND]).toBe('INPS');
  });
});
