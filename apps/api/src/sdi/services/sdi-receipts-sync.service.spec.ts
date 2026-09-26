import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { PecImapService } from './pec-imap.service.js';
import type { PecSettingsService } from './pec-settings.service.js';
import { SdiReceiptsSyncService } from './sdi-receipts-sync.service.js';
import type { SdiReceiptsService } from './sdi-receipts.service.js';

type Row = Record<string, unknown>;

function setup(opts: { claimed?: number; messages?: number; failAt?: number } = {}) {
  const state: Row = { tenantId: 't1', uidValidity: 7n, lastUid: 10n, syncStartedAt: null };
  const saved: Row[] = [];
  const prisma = {
    pecMailboxState: {
      upsert: vi.fn().mockResolvedValue(state),
      updateMany: vi.fn().mockResolvedValue({ count: opts.claimed ?? 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(state),
      update: vi.fn(({ data }: { data: Row }) => { saved.push(data); Object.assign(state, data); return Promise.resolve(state); }),
    },
    sdiTransmission: { findFirst: vi.fn().mockResolvedValue({ createdAt: new Date('2026-09-20T10:00:00Z') }) },
  };
  const readInbox = vi.fn(async (_c: unknown, _cursor: unknown, handle: (m: { uidValidity: bigint; uid: bigint; source: Buffer }) => Promise<void>) => {
    for (let i = 1; i <= (opts.messages ?? 2); i++) await handle({ uidValidity: 7n, uid: 10n + BigInt(i), source: Buffer.from('x') });
    return { uidValidity: 7n, lastUid: 10n + BigInt(opts.messages ?? 2) };
  });
  const settings = { connection: vi.fn().mockResolvedValue({}) } as unknown as PecSettingsService;
  let calls = 0;
  const apply = vi.fn(() => {
    calls += 1;
    return calls === opts.failAt ? Promise.reject(new Error('database unreachable')) : Promise.resolve(true);
  });
  const service = new SdiReceiptsSyncService(prisma as unknown as PrismaService, settings, { readInbox } as unknown as PecImapService, { apply } as unknown as SdiReceiptsService);
  return { service, state, saved, readInbox };
}

describe('SdiReceiptsSyncService.sync', () => {
  it('resumes from the saved UIDVALIDITY and UID, with the date to rescan from if they no longer match', async () => {
    const { service, readInbox } = setup();
    await service.sync('t1');
    expect(readInbox.mock.calls[0][1]).toEqual({ uidValidity: 7n, lastUid: 10n, since: new Date('2026-09-19T10:00:00Z') });
  });

  it('saves the UID after each message and releases the lock', async () => {
    const { service, saved, state } = setup();
    expect(await service.sync('t1')).toEqual({ status: 'DONE', read: 2, matched: 2 });
    expect(saved.filter((d) => 'lastUid' in d).map((d) => d.lastUid)).toEqual([11n, 12n, 12n]);
    expect(state.syncStartedAt).toBeNull();
  });

  it('after a failure the next sync resumes from the last message handled, not from the start', async () => {
    const { service, state } = setup({ messages: 3, failAt: 2 });
    expect(await service.sync('t1')).toMatchObject({ status: 'ERROR', read: 2, matched: 1 });
    expect(state.lastUid).toBe(11n);
    expect(state.syncStartedAt).toBeNull();
  });

  it('does not start while another sync of the same tenant runs', async () => {
    const { service, readInbox } = setup({ claimed: 0 });
    expect(await service.sync('t1')).toEqual({ status: 'BUSY', read: 0, matched: 0 });
    expect(readInbox).not.toHaveBeenCalled();
  });
});
