import { Injectable, NotFoundException } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { quoteLocator, SourceRegistrySchema, type SourceRecord, type SourceRef } from '@opentax-it/fiscal-rules';
import { PrismaService } from '../prisma/prisma.service.js';

/** Registry of the official sources (docs/fonti in the repository; SOURCES_DIR to move it). */
export const SOURCES_DIR = process.env.SOURCES_DIR
  ? resolve(process.env.SOURCES_DIR)
  : resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'docs', 'fonti');

/** Characters of archived text shown around a quoted fragment. */
const CONTEXT = 240;

export interface ExcerptPart {
  text: string;
  mark: boolean;
}

export interface Citation {
  year: number;
  version: number;
  /** Rule set field or section (e.g. `inps.fullRatePct`). */
  key: string;
  /** Value of the field in the active rule set; undefined for entries that are not a field. */
  value: unknown;
  title: string;
  quote: string;
  verifiedOn: string;
  /** False when the source is one of the `additional` sources of the entry. */
  main: boolean;
  /** Excerpts of the archived text with the quoted fragments marked; close fragments share one excerpt. */
  excerpts: ExcerptPart[][];
  /** Fragments not found in the archived text (the tests keep this empty for bundled sets). */
  missing: string[];
}

const valueAt = (data: unknown, path: string) =>
  path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), data);

/**
 * Excerpts of `text` around the quoted ranges, with the ranges marked. Ranges closer than the
 * context share one excerpt, so fragments of the same sentence are not shown twice.
 */
export function excerpts(text: string, ranges: Array<{ start: number; end: number }>): ExcerptPart[][] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const groups: Array<Array<{ start: number; end: number }>> = [];
  for (const r of sorted) {
    const last = groups.at(-1);
    if (last && r.start - last.at(-1)!.end <= CONTEXT) last.push(r);
    else groups.push([r]);
  }
  return groups.map((group) => {
    const start = group[0].start;
    const end = group.at(-1)!.end;
    // Cut the context at whitespace so words are not split.
    let from = Math.max(0, start - CONTEXT);
    let to = Math.min(text.length, end + CONTEXT);
    if (from > 0) from = text.indexOf(' ', from) + 1 || from;
    if (to < text.length) to = text.lastIndexOf(' ', to) > end ? text.lastIndexOf(' ', to) : to;
    const parts: ExcerptPart[] = [{ text: (from > 0 ? '… ' : '') + text.slice(from, start), mark: false }];
    group.forEach((r, i) => {
      if (i > 0) parts.push({ text: text.slice(group[i - 1].end, r.start), mark: false });
      parts.push({ text: text.slice(r.start, r.end), mark: true });
    });
    parts.push({ text: text.slice(end, to) + (to < text.length ? ' …' : ''), mark: false });
    return parts;
  });
}

@Injectable()
export class SourcesService {
  constructor(private readonly prisma: PrismaService) {}

  private async registry(): Promise<SourceRecord[]> {
    return SourceRegistrySchema.parse(JSON.parse(await readFile(this.path('registro.json'), 'utf8'))).sources;
  }

  private async source(id: string): Promise<SourceRecord> {
    const source = (await this.registry()).find((s) => s.id === id);
    if (!source) throw new NotFoundException('Fonte non trovata');
    return source;
  }

  /** Absolute path inside the registry directory; anything resolving outside it is refused. */
  private path(relativePath: string): string {
    const full = resolve(SOURCES_DIR, relativePath);
    if (full !== SOURCES_DIR && !full.startsWith(SOURCES_DIR + sep)) throw new NotFoundException('File non presente nel registro delle fonti');
    return full;
  }

  /** sourceRefs entries of the active rule sets that cite a source, main or additional. */
  private async references(): Promise<Array<{ year: number; version: number; data: unknown; key: string; ref: SourceRef; sourceId: string; quote: string; main: boolean }>> {
    const sets = await this.prisma.fiscalRuleSet.findMany({ where: { status: 'ACTIVE' }, orderBy: { year: 'desc' }, select: { year: true, version: true, data: true, sourceRefs: true } });
    return sets.flatMap((set) =>
      Object.entries(set.sourceRefs as Record<string, SourceRef>).flatMap(([key, ref]) => [
        ...(ref.sourceId ? [{ year: set.year, version: set.version, data: set.data, key, ref, sourceId: ref.sourceId, quote: ref.quote, main: true }] : []),
        ...(ref.additional ?? []).map((a) => ({ year: set.year, version: set.version, data: set.data, key, ref, sourceId: a.sourceId, quote: a.quote, main: false })),
      ]),
    );
  }

  /** All registered sources, with the rule set years and number of entries that cite them. */
  async list() {
    const [sources, refs] = await Promise.all([this.registry(), this.references()]);
    return sources.map((s) => {
      const citing = refs.filter((r) => r.sourceId === s.id);
      return { ...s, citations: citing.length, years: [...new Set(citing.map((r) => r.year))] };
    });
  }

  /** A source with every citation of the active rule sets, located in its archived text. */
  async detail(id: string): Promise<{ source: SourceRecord; citations: Citation[] }> {
    const source = await this.source(id);
    const citing = (await this.references()).filter((r) => r.sourceId === id);
    const text = citing.length > 0 ? await readFile(this.path(source.text ?? source.file), 'utf8') : '';
    const locate = quoteLocator(text);
    const citations = citing.map(({ year, version, data, key, ref, quote, main }) => {
      const { ranges, missing } = locate(quote);
      return { year, version, key, value: valueAt(data, key), title: ref.title, quote, verifiedOn: ref.verifiedOn, main, excerpts: excerpts(text, ranges), missing };
    });
    return { source, citations };
  }

  /** The archived file, or with `text` the extracted text of a PDF or XLS. */
  async file(id: string, text: boolean): Promise<{ fileName: string; contentType: string; content: Buffer }> {
    const source = await this.source(id);
    const relative = text && source.text ? source.text : source.file;
    const extension = relative.slice(relative.lastIndexOf('.') + 1);
    const contentType = extension === 'pdf' ? 'application/pdf' : extension === 'xls' ? 'application/vnd.ms-excel' : 'text/plain; charset=utf-8';
    return { fileName: relative.slice(relative.lastIndexOf('/') + 1), contentType, content: await readFile(this.path(relative)) };
  }
}
