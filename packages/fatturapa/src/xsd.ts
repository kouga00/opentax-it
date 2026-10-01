import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Path of the bundled official XSD (Schema_VFPR12_v1.2.3 with a local xmldsig import). */
export const FPR12_XSD_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas', 'Schema_VFPR12_v1.2.3.xsd');

export function isXmllintAvailable(): boolean {
  try {
    execFileSync('xmllint', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Validate an XML string against the FatturaPA XSD using libxml2's xmllint. Returns validation errors (empty = valid). */
export function validateWithXsd(xml: string): string[] {
  const dir = mkdtempSync(join(tmpdir(), 'fatturapa-'));
  const file = join(dir, 'invoice.xml');
  try {
    writeFileSync(file, xml, 'utf8');
    execFileSync('xmllint', ['--noout', '--schema', FPR12_XSD_PATH, file], { stdio: ['ignore', 'ignore', 'pipe'] });
    return [];
  } catch (err) {
    const stderr = (err as { stderr?: Buffer }).stderr?.toString() ?? String(err);
    return stderr.split('\n').filter((l) => l.trim() && !l.includes('fails to validate'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
