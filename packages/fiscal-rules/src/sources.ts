import { z } from 'zod';

/**
 * Registry of the official sources (docs/fonti/registro.json): one entry per document read,
 * with the archived copy and its SHA-256. Quotes in `sourceRefs` are verbatim excerpts of the
 * archived text; fragments are separated by "..." and checked one by one.
 */

export const SourceRecordSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  authority: z.string(),
  title: z.string(),
  kind: z.enum(['law', 'circular', 'resolution', 'instructions', 'specification', 'guide', 'table', 'web-page']),
  url: z.string().url(),
  /** Where the archived content is downloaded from, when it differs from `url` (e.g. the PDF of an INPS circular). */
  fetchUrl: z.string().url().optional(),
  /** Page to open first for its session cookie (Gazzetta Ufficiale articles). */
  sessionUrl: z.string().url().optional(),
  format: z.enum(['pdf', 'html', 'xls']),
  /** Opening-tag fragment of the element that holds the text of an HTML page. */
  contentSelector: z.string().optional(),
  /** Character encoding of an HTML page that is not UTF-8 (e.g. `iso-8859-1` on telematici.agenziaentrate.gov.it). */
  charset: z.string().optional(),
  /** Archived file, relative to docs/fonti; the hash covers this file. For HTML pages it is the extracted text. */
  file: z.string(),
  /** Extracted text of a PDF or XLS file, relative to docs/fonti. */
  text: z.string().optional(),
  retrievedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
});

export const SourceRegistrySchema = z.object({ sources: z.array(SourceRecordSchema) });

export type SourceRecord = z.infer<typeof SourceRecordSchema>;
export type SourceRegistry = z.infer<typeof SourceRegistrySchema>;

const QUOTE_MARKS = new Set(['’', '‘', "'", '`', '´', '"', '“', '”', '«', '»']);
const DASHES = new Set(['‐', '‑', '–', '—', '−']);

const HYPHEN_BREAK = /[ \t]*\n\s*(?=\p{L})/uy;
const LETTER = /\p{L}/u;
const SPACE = /\s/;
const MARK = /\p{M}/u;

/**
 * Text normalised for quote matching, with the index in `text` of the character each normalised
 * character comes from. Accents, apostrophes and quotation marks are removed (the Gazzetta
 * Ufficiale writes "attivita'" for "attività"), Normattiva's "((...))" amendment markers are
 * removed, dashes unified, words hyphenated across lines rejoined, whitespace collapsed.
 */
function normalizeWithMap(text: string): { chars: string; map: number[] } {
  const out: string[] = [];
  const map: number[] = [];
  let last = '';
  const push = (c: string, at: number) => {
    if (SPACE.test(c)) {
      if (last === ' ') return;
      c = ' ';
    }
    for (const lower of c.toLowerCase()) {
      out.push(lower);
      map.push(at);
      last = lower;
    }
  };
  for (let i = 0; i < text.length; ) {
    const c = String.fromCodePoint(text.codePointAt(i)!);
    const next = i + c.length;
    if (c === '\u00ad') { i = next; continue; }
    if ((c === '(' || c === ')') && text[next] === c) { i = next + 1; continue; }
    if (c === '-' && LETTER.test(last)) {
      HYPHEN_BREAK.lastIndex = next;
      if (HYPHEN_BREAK.test(text)) { i = HYPHEN_BREAK.lastIndex; continue; }
    }
    for (const d of c.normalize('NFD')) {
      if (MARK.test(d) || QUOTE_MARKS.has(d)) continue;
      push(d === '°' || d === 'º' ? 'o' : DASHES.has(d) ? '-' : d, i);
    }
    i = next;
  }
  return { chars: out.join(''), map };
}

/** Text normalised for quote matching (see `normalizeWithMap`). */
export function normalizeForQuote(text: string): string {
  return normalizeWithMap(text).chars;
}

/** The verbatim fragments of a quote ("first part ... second part"). */
export function quoteFragments(quote: string): string[] {
  return quote.split(/\.\.\.|…/).map((f) => f.trim()).filter(Boolean);
}

export interface QuoteLocation {
  /** Ranges of the original text (end excluded), in the order of the fragments found. */
  ranges: Array<{ start: number; end: number }>;
  /** Fragments not found in the text. */
  missing: string[];
}

/** Locator of quotes in one text; the text is normalised once, so it can be reused for many quotes. */
export function quoteLocator(text: string): (quote: string) => QuoteLocation {
  const { chars, map } = normalizeWithMap(text);
  return (quote) => {
    const ranges: QuoteLocation['ranges'] = [];
    const missing: string[] = [];
    let from = 0;
    for (const fragment of quoteFragments(quote)) {
      const needle = normalizeForQuote(fragment).trim();
      // Fragments are usually in reading order; a quote may also list them out of order.
      let at = needle ? chars.indexOf(needle, from) : -1;
      if (at < 0 && needle) at = chars.indexOf(needle);
      if (at < 0) {
        missing.push(fragment);
        continue;
      }
      ranges.push({ start: map[at], end: map[at + needle.length - 1] + 1 });
      from = at + needle.length;
    }
    return { ranges, missing };
  };
}

/** Where `quote` is in `text`. */
export function locateQuote(text: string, quote: string): QuoteLocation {
  return quoteLocator(text)(quote);
}

/** Fragments of `quote` that do not appear in `text` (empty when the quote is verbatim). */
export function missingQuoteFragments(text: string, quote: string): string[] {
  return locateQuote(text, quote).missing;
}

/**
 * Sections whose `sourceRefs` entry quotes one passage with all their values (e.g. the four tax
 * codes in one list of the instructions). Any other field needs its own entry.
 */
export const SECTION_REF_KEYS: ReadonlySet<string> = new Set(['installments', 'stampDuty', 'taxCodes', 'inpsReasons', 'inpsSelfEmployed.artisansReasons', 'inpsSelfEmployed.tradersReasons', 'eInvoice', 'taxNotices', 'penalties', 'intrastat']);

/**
 * `sourceRefs` entries that are not a value of the rule set: the INPS reasons table as a whole,
 * and the rule (applied in `inpsAdvance`) that the INPS advance uses the rates of the following year.
 */
export const DOCUMENT_REF_KEYS: ReadonlySet<string> = new Set(['inpsReasons.table', 'inps.advanceRateYear']);

const isMonthDay = (v: unknown) => !!v && typeof v === 'object' && Object.keys(v).sort().join() === 'day,month';
const isRange = (v: unknown) => !!v && typeof v === 'object' && Object.keys(v).sort().join() === 'from,to';

/**
 * Values of a rule set by dotted path, in declaration order. A value is a number, string,
 * list, day of the year, range of days or the ATECO table; `year` and `sourceRefs` are left out.
 */
export function ruleFieldPaths(data: object): Map<string, unknown> {
  const out = new Map<string, unknown>();
  const walk = (value: unknown, path: string) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && !isMonthDay(value) && !isRange(value) && !path.endsWith('profitabilityByAteco')) {
      for (const [k, v] of Object.entries(value)) if (path || (k !== 'year' && k !== 'sourceRefs')) walk(v, path ? `${path}.${k}` : k);
    } else out.set(path, value);
  };
  walk(data, '');
  return out;
}

/** The `sourceRefs` key covering a field: its own entry or the entry of a section in SECTION_REF_KEYS. */
export function refKeyFor(sourceRefs: Record<string, unknown>, path: string): string | undefined {
  if (path in sourceRefs) return path;
  return Object.keys(sourceRefs).filter((k) => SECTION_REF_KEYS.has(k) && path.startsWith(`${k}.`)).sort((a, b) => b.length - a.length)[0];
}

export interface RuleSetDiff {
  /** Fields whose value differs; `before`/`after` undefined when the field is missing on that side. */
  values: Array<{ path: string; before: unknown; after: unknown }>;
  /** sourceRefs entries whose source, title, quote or additional sources differ (the verification date alone is not a change). */
  sources: Array<{ key: string; before?: Record<string, unknown>; after?: Record<string, unknown> }>;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const withoutDate = (ref: unknown) => {
  if (!ref || typeof ref !== 'object') return ref;
  const { verifiedOn: _verifiedOn, ...rest } = ref as Record<string, unknown>;
  return rest;
};

/** What changes from one rule set to another: values by field and sources by entry. */
export function diffRuleSets(from: { data: object; sourceRefs: Record<string, unknown> }, to: { data: object; sourceRefs: Record<string, unknown> }): RuleSetDiff {
  const a = ruleFieldPaths(from.data);
  const b = ruleFieldPaths(to.data);
  const values = [...new Set([...a.keys(), ...b.keys()])]
    .filter((path) => !same(a.get(path), b.get(path)))
    .map((path) => ({ path, before: a.get(path), after: b.get(path) }));
  const sources = [...new Set([...Object.keys(from.sourceRefs), ...Object.keys(to.sourceRefs)])]
    .filter((key) => !same(withoutDate(from.sourceRefs[key]), withoutDate(to.sourceRefs[key])))
    .map((key) => ({ key, before: from.sourceRefs[key] as Record<string, unknown> | undefined, after: to.sourceRefs[key] as Record<string, unknown> | undefined }));
  return { values, sources };
}
