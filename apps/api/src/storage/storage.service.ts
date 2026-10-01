import { Injectable } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Local file storage (XML invoices, SDI receipts, attachments). Root from STORAGE_DIR (default: apps/api/storage, independent of the working directory). */
@Injectable()
export class StorageService {
  private readonly root = process.env.STORAGE_DIR
    ? resolve(process.env.STORAGE_DIR)
    : resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'storage');

  /** With `exclusive` the write fails (EEXIST) instead of replacing an existing file. */
  async write(relativePath: string, content: string | Buffer, options: { exclusive?: boolean } = {}): Promise<string> {
    const full = this.resolve(relativePath);
    // Owner-only permissions: the files hold fiscal codes, amounts and customer data.
    await mkdir(dirname(full), { recursive: true, mode: 0o700 });
    await writeFile(full, content, { flag: options.exclusive ? 'wx' : 'w', mode: 0o600 });
    return relativePath;
  }

  async read(relativePath: string): Promise<Buffer> {
    return readFile(this.resolve(relativePath));
  }

  /** Absolute path inside the storage root; anything resolving outside it (e.g. "../") is refused. */
  private resolve(relativePath: string): string {
    const full = resolve(this.root, relativePath);
    if (!full.startsWith(this.root + sep)) throw new Error(`Storage path outside the storage directory: ${relativePath}`);
    return full;
  }
}
