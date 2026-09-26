#!/usr/bin/env node
// Archive of the official sources listed in docs/fonti/registro.json.
//
//   node scripts/fonti.mjs archive <id> [<id>...]   download, extract text, update hash and date
//   node scripts/fonti.mjs check [<id>...]          download again and report sources whose content changed (writes nothing)
//
// PDF text is extracted with `pdftotext` (poppler); HTML pages are archived as extracted text only,
// limited to the element in `contentSelector` so that site menus do not change the hash.
// XLS files are archived as they are; their text (`.tsv`) is prepared by hand, see docs/fonti/README.md.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'docs/fonti');
const REGISTRY = join(DIR, 'registro.json');
const OFFICIAL_HOSTS = /(^|\.)(agenziaentrate\.gov\.it|normattiva\.it|gazzettaufficiale\.it|inps\.it|adm\.gov\.it|fatturapa\.gov\.it|agid\.gov\.it)$/;
const UA = 'Mozilla/5.0 (opentax-it source archive)';

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });

async function download(source) {
  const url = source.fetchUrl ?? source.url;
  if (!OFFICIAL_HOSTS.test(new URL(url).hostname)) throw new Error(`${source.id}: ${url} is not an official domain`);
  const headers = { 'user-agent': UA };
  // Gazzetta Ufficiale serves single articles only within the session opened by the act page.
  if (source.sessionUrl) {
    const res = await fetch(source.sessionUrl, { headers });
    headers.cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${source.id}: HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', agrave: 'à', aacute: 'á', egrave: 'è', eacute: 'é', igrave: 'ì', iacute: 'í', ograve: 'ò', oacute: 'ó', ugrave: 'ù', uacute: 'ú', Agrave: 'À', Egrave: 'È', Eacute: 'É', Igrave: 'Ì', Ograve: 'Ò', Ugrave: 'Ù', times: '×', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…', deg: '°', ordm: 'º', euro: '€', middot: '·', bull: '•', shy: '' };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTITIES[e] ?? m));

/** The element whose opening tag contains `selector` (e.g. `class="bodyTesto"`), with its children. */
function selectElement(html, selector, id) {
  const at = html.indexOf(selector);
  if (at < 0) throw new Error(`${id}: selector ${selector} not found`);
  const start = html.lastIndexOf('<', at);
  const tag = /^<([a-z0-9]+)/i.exec(html.slice(start))[1].toLowerCase();
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = start;
  let depth = 0;
  for (let m; (m = re.exec(html)); ) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, re.lastIndex);
  }
  return html.slice(start);
}

const BLOCK = 'p|div|br|li|tr|h[1-6]|table|section|article|ul|ol|td|th|dd|dt|pre|blockquote|main';
function htmlToText(html) {
  const text = decode(
    html
      .replace(/<(script|style|noscript|svg|head)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(new RegExp(`</?(${BLOCK})\\b[^>]*>`, 'gi'), '\n')
      .replace(/<[^>]+>/g, ''),
  ).replace(/ /g, ' ');
  const lines = text.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim());
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function pdfToText(buf) {
  const dir = mkdtempSync(join(tmpdir(), 'fonti-'));
  try {
    writeFileSync(join(dir, 'in.pdf'), buf);
    execFileSync('pdftotext', ['-enc', 'UTF-8', join(dir, 'in.pdf'), join(dir, 'out.txt')]);
    return readFileSync(join(dir, 'out.txt'), 'utf8');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Archived content of a source: `file` is what the hash covers, `text` the extracted text if separate. */
function extract(source, buf) {
  if (source.format === 'html') {
    const raw = buf.toString('utf8');
    return { file: Buffer.from(htmlToText(source.contentSelector ? selectElement(raw, source.contentSelector, source.id) : raw)) };
  }
  if (source.format === 'pdf') return { file: buf, text: pdfToText(buf) };
  return { file: buf };
}

const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
const [command, ...ids] = process.argv.slice(2);
const pick = (all) => {
  if (ids.length === 0) return all ? registry.sources : [];
  return ids.map((id) => registry.sources.find((s) => s.id === id) ?? (() => { throw new Error(`Unknown source ${id}`); })());
};

if (command === 'archive') {
  const selected = pick(false);
  if (selected.length === 0) throw new Error('Name the sources to archive: node scripts/fonti.mjs archive <id> ...');
  for (const source of selected) {
    const out = extract(source, await download(source));
    writeFileSync(join(DIR, source.file), out.file);
    if (out.text !== undefined) writeFileSync(join(DIR, source.text), out.text);
    else if (source.format === 'xls') console.warn(`${source.id}: update ${source.text} by hand from the new file`);
    Object.assign(source, { retrievedOn: today(), sha256: sha256(out.file) });
    console.log(`${source.id}: archived (${out.file.length} bytes)`);
  }
  writeFileSync(REGISTRY, JSON.stringify(registry, null, 2) + '\n');
} else if (command === 'check') {
  let changed = 0;
  for (const source of pick(true)) {
    try {
      const hash = sha256(extract(source, await download(source)).file);
      if (hash === source.sha256) console.log(`= ${source.id}`);
      else { changed++; console.log(`≠ ${source.id}: changed since ${source.retrievedOn}`); }
    } catch (e) {
      changed++;
      console.log(`! ${source.id}: ${e.message}`);
    }
  }
  process.exitCode = changed ? 1 : 0;
} else {
  console.log('Usage: node scripts/fonti.mjs archive <id>... | check [<id>...]');
  process.exitCode = 2;
}
