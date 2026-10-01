import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StorageService } from './storage.service.js';

describe('StorageService', () => {
  let dir: string;
  let storage: StorageService;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'opentax-storage-'));
    process.env.STORAGE_DIR = dir;
    storage = new StorageService();
  });

  afterEach(async () => {
    delete process.env.STORAGE_DIR;
    await rm(dir, { recursive: true, force: true });
  });

  it('writes owner-only files and reads them back', async () => {
    await storage.write('t1/invoices/2026/a.xml', '<a/>');
    expect((await storage.read('t1/invoices/2026/a.xml')).toString()).toBe('<a/>');
    expect((await stat(join(dir, 't1/invoices/2026/a.xml'))).mode & 0o777).toBe(0o600);
    expect((await stat(join(dir, 't1/invoices/2026'))).mode & 0o777).toBe(0o700);
  });

  it('refuses paths that resolve outside the storage directory', async () => {
    await expect(storage.write('../escape.xml', 'x')).rejects.toThrow('outside the storage directory');
    await expect(storage.read('t1/../../etc/passwd')).rejects.toThrow('outside the storage directory');
    await expect(storage.read('/etc/passwd')).rejects.toThrow('outside the storage directory');
  });

  it('does not overwrite with the exclusive flag', async () => {
    await storage.write('b.xml', 'first', { exclusive: true });
    await expect(storage.write('b.xml', 'second', { exclusive: true })).rejects.toThrow(/EEXIST/);
  });
});
