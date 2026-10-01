import { NotFoundException } from '@nestjs/common';
import { ruleSet2026 } from '@opentax-it/fiscal-rules';
import { describe, expect, it } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { excerpts, SourcesService } from './sources.service.js';

// Reads the real registry in docs/fonti; the active rule set is the bundled 2026 one.
const { sourceRefs, ...data } = ruleSet2026;
const prisma = { fiscalRuleSet: { findMany: () => Promise.resolve([{ year: 2026, version: 5, data, sourceRefs }]) } } as unknown as PrismaService;
const service = new SourcesService(prisma);

describe('SourcesService', () => {
  it('lists every registered source with the entries that cite it', async () => {
    const list = await service.list();
    expect(list.find((s) => s.id === 'inps-circ-8-2026')).toMatchObject({ authority: 'INPS', years: [2026] });
    expect(list.find((s) => s.id === 'normattiva-l-633-1941-art5')).toMatchObject({ citations: 0, years: [] });
  });

  it('marks each quoted fragment in the archived text, with the value of the field', async () => {
    const { citations } = await service.detail('inps-circ-8-2026');
    const rate = citations.find((c) => c.key === 'inps.fullRatePct')!;
    expect(rate).toMatchObject({ value: 26.07, main: true, missing: [] });
    expect(rate.excerpts[0].find((p) => p.mark)?.text).toContain('26,07%');
  });

  it('includes additional sources, not marked as main', async () => {
    const { citations } = await service.detail('ade-ris-93e-2019');
    expect(citations).toEqual([expect.objectContaining({ key: 'advancePayment.isaSubjectsFirstInstallmentPct', main: false, missing: [] })]);
  });

  it('serves the archived file or its text, and refuses unknown sources', async () => {
    await expect(service.file('inps-circ-8-2026', false)).resolves.toMatchObject({ contentType: 'application/pdf', fileName: 'inps-circ-8-2026.pdf' });
    await expect(service.file('inps-circ-8-2026', true)).resolves.toMatchObject({ contentType: 'text/plain; charset=utf-8', fileName: 'inps-circ-8-2026.txt' });
    await expect(service.detail('../package')).rejects.toThrow(NotFoundException);
  });

  it('shows close fragments in one excerpt', () => {
    const text = 'Per il 2026 il minimale di reddito previsto dalla legge è pari a 18.808,00 euro.';
    const range = (s: string) => ({ start: text.indexOf(s), end: text.indexOf(s) + s.length });
    const parts = excerpts(text, [range('il minimale di reddito'), range('è pari a 18.808,00 euro')]);
    expect(parts).toHaveLength(1);
    expect(parts[0].filter((p) => p.mark).map((p) => p.text)).toEqual(['il minimale di reddito', 'è pari a 18.808,00 euro']);
    expect(parts[0].map((p) => p.text).join('')).toBe(text);
  });
});
