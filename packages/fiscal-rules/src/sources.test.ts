import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { FiscalRuleSet } from './rule-set';
import { ruleSet2025 } from './rule-sets/2025';
import { ruleSet2026 } from './rule-sets/2026';
import { diffRuleSets, DOCUMENT_REF_KEYS, locateQuote, missingQuoteFragments, normalizeForQuote, quoteFragments, quoteLocator, refKeyFor, ruleFieldPaths, SourceRegistrySchema } from './sources';

const DIR = fileURLToPath(new URL('../../../docs/fonti/', import.meta.url));
const registry = SourceRegistrySchema.parse(JSON.parse(readFileSync(DIR + 'registro.json', 'utf8')));
const byId = new Map(registry.sources.map((s) => [s.id, s]));
const locators = new Map<string, ReturnType<typeof quoteLocator>>();
/** Locator on the archived text of a source, built once per source. */
const locatorOf = (id: string) => {
  if (!locators.has(id)) locators.set(id, quoteLocator(readFileSync(DIR + (byId.get(id)!.text ?? byId.get(id)!.file), 'utf8')));
  return locators.get(id)!;
};

describe('quote matching', () => {
  it('ignores accents written as apostrophes, Normattiva markers, dashes and line breaks', () => {
    expect(normalizeForQuote("attivita' economiche")).toBe(normalizeForQuote('attività economiche'));
    expect(missingQuoteFragments('sanzione ((pari al venticinque)) per\ncento', 'sanzione pari al venticinque per cento')).toEqual([]);
    expect(missingQuoteFragments('1792: imposta – saldo', '1792: imposta - saldo')).toEqual([]);
    expect(missingQuoteFragments('entro il sessan-\ntesimo giorno', 'entro il sessantesimo giorno')).toEqual([]);
  });

  it('checks every fragment separately', () => {
    expect(quoteFragments('primo ... secondo … terzo')).toEqual(['primo', 'secondo', 'terzo']);
    expect(missingQuoteFragments('primo e poi secondo', 'primo ... terzo')).toEqual(['terzo']);
  });

  it('locates the fragments in the original text', () => {
    const text = "Il versamento e' dovuto ((entro il)) 30\ngiugno. Poi l'acconto.";
    const { ranges, missing } = locateQuote(text, 'versamento è dovuto entro il 30 giugno ... acconto');
    expect(missing).toEqual([]);
    expect(ranges.map((r) => text.slice(r.start, r.end))).toEqual(["versamento e' dovuto ((entro il)) 30\ngiugno", 'acconto']);
  });
});

describe('source registry', () => {
  it('has unique ids and official domains', () => {
    expect(byId.size).toBe(registry.sources.length);
    for (const s of registry.sources) {
      for (const url of [s.url, s.fetchUrl, s.sessionUrl].filter(Boolean) as string[]) {
        expect(new URL(url).hostname, s.id).toMatch(/(^|\.)(agenziaentrate\.gov\.it|normattiva\.it|gazzettaufficiale\.it|inps\.it|adm\.gov\.it|fatturapa\.gov\.it|agid\.gov\.it)$/);
      }
    }
  });

  it('archived files exist and match their SHA-256', () => {
    for (const s of registry.sources) {
      const hash = createHash('sha256').update(readFileSync(DIR + s.file)).digest('hex');
      expect(hash, s.id).toBe(s.sha256);
      if (s.text) expect(existsSync(DIR + s.text), s.id).toBe(true);
    }
  });
});

const fieldPaths = (rules: FiscalRuleSet) => ruleFieldPaths(rules);
const refKey = (rules: FiscalRuleSet, path: string) => refKeyFor(rules.sourceRefs, path);

describe.each([ruleSet2025, ruleSet2026] as FiscalRuleSet[])('sourceRefs of rule set $year', (rules) => {
  const refs = Object.entries(rules.sourceRefs);
  const fields = fieldPaths(rules);

  it('cover every field, with its own entry or the entry of a section in SECTION_REF_KEYS', () => {
    expect([...fields.keys()].filter((path) => !refKey(rules, path))).toEqual([]);
  });

  it('are keyed by fields or sections of the rule set', () => {
    const paths = [...fields.keys()];
    expect(refs.map(([key]) => key).filter((key) => !DOCUMENT_REF_KEYS.has(key) && !paths.some((p) => p === key || p.startsWith(`${key}.`)))).toEqual([]);
  });

  it('point to a registered source with the same URL', () => {
    for (const [key, ref] of refs) {
      const source = ref.sourceId ? byId.get(ref.sourceId) : undefined;
      expect(source, `${key}: sourceId ${ref.sourceId}`).toBeDefined();
      expect([source!.url, source!.fetchUrl], key).toContain(ref.url);
      for (const extra of ref.additional ?? []) expect(byId.has(extra.sourceId), `${key}: ${extra.sourceId}`).toBe(true);
    }
  });

  it('quote the archived text verbatim', () => {
    const missing: Record<string, string[]> = {};
    for (const [key, ref] of refs) {
      for (const { sourceId, quote } of [{ sourceId: ref.sourceId!, quote: ref.quote }, ...(ref.additional ?? [])]) {
        const fragments = locatorOf(sourceId)(quote).missing;
        if (fragments.length > 0) missing[`${key} (${sourceId})`] = fragments;
      }
    }
    expect(missing).toEqual({});
  });
});

describe('rule set 2025 derived from 2026', () => {
  it('has its own source for every value that differs from 2026', () => {
    const fields2026 = fieldPaths(ruleSet2026);
    const inherited = [...fieldPaths(ruleSet2025)]
      .filter(([path, value]) => JSON.stringify(value) !== JSON.stringify(fields2026.get(path)))
      .filter(([path]) => ruleSet2025.sourceRefs[refKey(ruleSet2025, path)!] === ruleSet2026.sourceRefs[refKey(ruleSet2026, path)!])
      .map(([path]) => path);
    expect(inherited).toEqual([]);
  });
});

describe('diffRuleSets', () => {
  it('lists changed values by field and changed sources by entry, ignoring the verification date', () => {
    const { sourceRefs: refs2026, ...data2026 } = ruleSet2026;
    const { sourceRefs: refs2025, ...data2025 } = ruleSet2025;
    const diff = diffRuleSets({ data: data2025, sourceRefs: refs2025 }, { data: data2026, sourceRefs: refs2026 });
    expect(diff.values).toContainEqual({ path: 'inps.incomeCeiling', before: 120_607, after: 122_295 });
    expect(diff.values.map((v) => v.path)).not.toContain('inps.fullRatePct');
    expect(diff.sources.map((s) => s.key)).toContain('inps.fullRatePct');
    const redated = { ...refs2026, 'inps.fullRatePct': { ...refs2026['inps.fullRatePct'], verifiedOn: '2030-01-01' } };
    expect(diffRuleSets({ data: data2026, sourceRefs: refs2026 }, { data: data2026, sourceRefs: redated })).toEqual({ values: [], sources: [] });
  });

  it('treats days of the year and the ATECO table as single values', () => {
    const paths = [...ruleFieldPaths(ruleSet2026).keys()];
    expect(paths).toContain('deadlines.installmentsEnd');
    expect(paths).toContain('taxNotices.summerSuspension');
    expect(paths).toContain('flatRate.profitabilityByAteco');
    expect(paths).not.toContain('year');
  });
});
