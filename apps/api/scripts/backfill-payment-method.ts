/**
 * One-off: fills Invoice.paymentMethod of issued and imported documents from their stored XML
 * (DatiPagamento/DettaglioPagamento/ModalitaPagamento). Documents without DatiPagamento stay empty.
 * Only empty values are written, so it can be run more than once.
 *
 *   pnpm --filter @opentax-it/api payment-method:backfill
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import pg from 'pg';
import { parseInvoiceXml } from '@opentax-it/fatturapa';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: [resolve(here, '../.env'), resolve(here, '../../../.env')], quiet: true });

// Same root as StorageService.
const storageRoot = process.env.STORAGE_DIR ? resolve(process.env.STORAGE_DIR) : resolve(here, '..', 'storage');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL non impostata (vedi .env.example)');
  process.exit(1);
}

// Plain pg: Node runs this file directly, and cannot load the generated Prisma client (TypeScript with .js imports).
const db = new pg.Client({ connectionString });
await db.connect();
try {
  const { rows } = await db.query<{ id: string; number: string; xmlPath: string }>(
    `SELECT "id", "number", "xmlPath" FROM "Invoice" WHERE "paymentMethod" IS NULL AND "xmlPath" IS NOT NULL`,
  );
  let filled = 0;
  for (const inv of rows) {
    const path = resolve(storageRoot, inv.xmlPath);
    if (!path.startsWith(storageRoot + sep)) continue;
    try {
      const method = parseInvoiceXml(await readFile(path, 'utf8')).payments[0]?.method;
      if (!method) continue;
      await db.query(`UPDATE "Invoice" SET "paymentMethod" = $1 WHERE "id" = $2 AND "paymentMethod" IS NULL`, [method, inv.id]);
      filled++;
    } catch (e) {
      console.warn(`Fattura ${inv.number}: XML non leggibile (${(e as Error).message})`);
    }
  }
  console.log(`Modalità di pagamento impostata su ${filled} documenti su ${rows.length} senza modalità.`);
} finally {
  await db.end();
}
