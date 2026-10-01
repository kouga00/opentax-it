import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findOtherEntity, OTHER_ENTITIES } from './other-entities';
import { normalizeForQuote, SourceRegistrySchema } from './sources';

const DIR = fileURLToPath(new URL('../../../docs/fonti/', import.meta.url));
const registry = SourceRegistrySchema.parse(JSON.parse(readFileSync(DIR + 'registro.json', 'utf8')));
const byId = new Map(registry.sources.map((s) => [s.id, s]));

/** Normalised text (see `normalizeForQuote`) with punctuation and dashes turned into single spaces. */
const words = (text: string) => ` ${normalizeForQuote(text).replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `;
const texts = new Map<string, string>();
const textOf = (id: string) => {
  if (!texts.has(id)) texts.set(id, words(readFileSync(DIR + (byId.get(id)!.text ?? byId.get(id)!.file), 'utf8')));
  return texts.get(id)!;
};

const ENTITY_CODES = 'ade-codici-altri-enti-2026-04-28';

describe('OTHER_ENTITIES', () => {
  it('has unique entity codes and unique reasons', () => {
    const codes = OTHER_ENTITIES.map((e) => e.code);
    expect(new Set(codes).size).toBe(codes.length);
    const reasons = OTHER_ENTITIES.flatMap((e) => e.reasons.map((r) => r.code));
    expect(new Set(reasons).size).toBe(reasons.length);
  });

  it('points to registered sources', () => {
    expect(byId.has(ENTITY_CODES)).toBe(true);
    for (const e of OTHER_ENTITIES) {
      expect(e.sourceIds.length, e.code).toBeGreaterThan(0);
      for (const id of e.sourceIds) expect(byId.has(id), `${e.code}: ${id}`).toBe(true);
    }
  });

  it.each(OTHER_ENTITIES.map((e) => [e.code, e] as const))('entity %s is in the AdE table of entity codes', (code, e) => {
    expect(textOf(ENTITY_CODES)).toContain(words(`${code} ${e.name}`));
  });

  it.each(OTHER_ENTITIES.map((e) => [e.code, e] as const))('reasons of entity %s come from its sources', (_, e) => {
    for (const r of e.reasons) {
      expect(r.code, e.code).toMatch(/^[A-Z0-9]{4}$/);
      expect(e.sourceIds.some((id) => textOf(id).includes(` ${r.code.toLowerCase()} `)), `${e.code} ${r.code}`).toBe(true);
      expect(e.sourceIds.some((id) => textOf(id).includes(words(r.description))), `${e.code} ${r.code}: ${r.description}`).toBe(true);
    }
  });

  it('has a well-formed fund type and period rule', () => {
    for (const e of OTHER_ENTITIES) {
      if (e.fundType !== undefined) expect(e.fundType, e.code).toMatch(/^TC\d\d$/);
      expect(e.periodRule.trim(), e.code).not.toBe('');
      expect(e.reasons.length, e.code).toBeGreaterThan(0);
    }
  });

  it('leaves out the suppressed EPPI reasons and asks CNPADC for the position code', () => {
    expect(findOtherEntity('0009')!.reasons.map((r) => r.code)).toEqual(['E068', 'E069', 'E070', 'E072', 'E073']);
    expect(findOtherEntity('0015')!.positionCode).toBe('REQUIRED');
    expect(OTHER_ENTITIES.filter((e) => e.code !== '0015').every((e) => e.positionCode === 'NONE')).toBe(true);
    expect(findOtherEntity('0007')!.period).toBe('YEAR');
    expect(findOtherEntity('9999')).toBeUndefined();
  });
});
