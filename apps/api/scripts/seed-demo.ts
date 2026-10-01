/**
 * Loads a fictitious tenant ("Demo Forfettario", INPS Gestione Separata) with customers, invoices issued
 * in the previous and current year with their SDI receipts, collections and manually entered year data,
 * so that the taxes summary, the deadline calendar and the F24 plan have something to show. Two
 * smaller tenants show the INPS Artigiani and Commercianti schemes (contribution-schemes.ts): "Demo Artigiano"
 * and "Demo Commerciante" (with the flat-rate reduction of 35%), with invented INPS codes, the four fixed installments
 * of this year and an F24 plan with the INPS rows above the minimum. Professional funds are not selectable yet, so
 * there is no demo for them.
 *
 * The SDI outcome of each invoice comes from a receipt uploaded through the import (as a user
 * would upload the ones of invoices sent with another tool): delivery (RC) for businesses,
 * impossibility of delivery (MC) for the private customer without an SDI channel, whose invoice is
 * made available in the customer's reserved area (Spec. FatturaPA 1.9.1 §1.5). The receipts follow
 * the official schema (MessaggiTypes_v1.1) but are not signed: real ones are signed by SDI. The
 * last invoice of the current year is left to send.
 *
 * Runs against a running API (default http://localhost:3000/api) through the public
 * endpoints, as a normal user, so every document goes through the same validation and the same
 * permissions as the UI. Idempotent: a second run finds each tenant by name among the demo user's
 * own tenants and skips it; with --reset those tenants are deleted (database rows and stored files)
 * and created again with the rules active now. All data is invented; VAT numbers and fiscal codes
 * have valid check characters but do not belong to anyone.
 *
 * Account: DEMO_EMAIL (default demo@opentax.it). On the first run the account is registered, with
 * DEMO_PASSWORD or a random password, and the credentials are printed right away, so they are not
 * lost if a later step fails. On later runs DEMO_PASSWORD is required: the script never changes a
 * password or a role. Each run logs in at most once (registration counts as the first session):
 * the API allows 5 logins or registrations per 15 minutes from one address.
 *
 * Rule sets are global and managed by an administrator (Regole fiscali, /rules; `pnpm admin:create`
 * makes an account administrator): the script only reads them and stops, saying what to do, when
 * a year has no active set or the active one lacks the INPS Artigiani e Commercianti section.
 *
 *   node scripts/seed-demo.ts [--reset]  (from apps/api; Node 24 runs TypeScript directly)
 *   pnpm demo:seed [--reset]             (from the repository root)
 */

import { randomBytes } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: [resolve(here, '../.env'), resolve(here, '../../../.env')], quiet: true });

const API = process.env.API_URL ?? 'http://localhost:3000/api';
const DEMO_EMAIL = (process.env.DEMO_EMAIL ?? 'demo@opentax.it').toLowerCase();
/** The demo account's password: given, or generated on registration. */
let demoPassword = process.env.DEMO_PASSWORD;
let sessionToken = '';
const TENANT_NAME = 'Demo Forfettario';
const thisYear = new Date().getFullYear();
const prevYear = thisYear - 1;

let sdiId = 800000;

/** SDI receipt as described by the official schema (MessaggiTypes_v1.1), without the signature. */
function sdiReceipt(type: 'RC' | 'MC', invoiceFileName: string, date: string): { name: string; contentBase64: string } {
  const root = type === 'RC' ? 'RicevutaConsegna' : 'NotificaMancataConsegna';
  const body = type === 'RC'
    ? `<DataOraConsegna>${date}T10:05:00</DataOraConsegna><Destinatario><Codice>ABCDEF1</Codice><Descrizione>Destinatario demo</Descrizione></Destinatario>`
    : '<Descrizione>Il file non è stato recapitato: la fattura è a disposizione del cliente nella sua area riservata</Descrizione>';
  const xml = `<?xml version="1.0" encoding="UTF-8"?><types:${root} xmlns:types="http://www.fatturapa.gov.it/sdi/messaggi/v1.0" versione="1.0">`
    + `<IdentificativoSdI>${++sdiId}</IdentificativoSdI><NomeFile>${invoiceFileName}</NomeFile><DataOraRicezione>${date}T10:00:00</DataOraRicezione>${body}`
    + `<MessageId>${sdiId}</MessageId></types:${root}>`;
  return { name: `${invoiceFileName.replace(/\.xml$/, '')}_${type}_001.xml`, contentBase64: Buffer.from(xml).toString('base64') };
}

/** Uploads the receipts through the import, like a user, and stops if one is not recorded. */
async function importReceipts(receipts: Array<{ name: string; contentBase64: string }>) {
  const results = await call<Array<{ file: string; status: string; message?: string }>>('POST', '/imports', { files: receipts });
  const failed = results.filter((r) => r.status !== 'IMPORTED');
  if (failed.length) throw new Error(`Receipts not recorded: ${failed.map((r) => `${r.file} ${r.message ?? r.status}`).join('; ')}`);
  console.log(`Recorded ${results.length} SDI receipts`);
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(sessionToken ? { authorization: `Bearer ${sessionToken}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${Array.isArray(json?.message) ? json.message.join('; ') : json?.message}`);
  return json as T;
}

/** Runs a query on the database of .env (the demo tenants' deletion and the account check, which the API does not expose). */
async function query<T>(sql: string, params: unknown[]): Promise<T[]> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(sql, params)).rows as T[];
  } finally {
    await client.end();
  }
}

/**
 * Deletes a demo tenant of the demo user and everything attached to it (all tenant relations cascade), then its stored
 * files. Only a tenant with that name whose member is the demo user: another user's tenant with the same name stays.
 */
async function deleteDemoTenant(id: string, name: string) {
  const deleted = await query(
    `DELETE FROM "Tenant" t WHERE t.id = $1 AND t.name = $2
       AND EXISTS (SELECT 1 FROM "TenantMember" m JOIN "User" u ON u.id = m."userId" WHERE m."tenantId" = t.id AND u.email = $3)
     RETURNING t.id`,
    [id, name, DEMO_EMAIL],
  );
  if (deleted.length !== 1) throw new Error(`Tenant ${id} "${name}" of ${DEMO_EMAIL} not found`);
  const storageRoot = process.env.STORAGE_DIR ? resolve(process.env.STORAGE_DIR) : resolve(here, '../storage');
  await rm(resolve(storageRoot, id), { recursive: true, force: true });
}

const RULES_HINT = 'An administrator loads and activates them in Regole fiscali (/rules); `pnpm admin:create <email>` makes an account administrator.';

/** Reads the active rule sets (public endpoints): each year needs one, with the INPS Artigiani e Commercianti section. */
async function checkRuleSets(years: number[]) {
  for (const year of years) {
    const status = await call<{ ok: boolean; reason?: string }>('GET', `/fiscal-rules/${year}/status`);
    if (!status.ok) throw new Error(`No usable rule set for ${year} (${status.reason ?? 'none active'}). ${RULES_HINT}`);
    const active = await call<{ inpsSelfEmployed?: unknown }>('GET', `/fiscal-rules/${year}/active`);
    if (!active.inpsSelfEmployed) throw new Error(`The active rule set ${year} has no INPS Artigiani e Commercianti section: activate the newer version. ${RULES_HINT}`);
  }
}

function printCredentials() {
  console.log(`\nDemo account: ${DEMO_EMAIL}${demoPassword && !process.env.DEMO_PASSWORD ? `, password ${demoPassword} (generated: keep it, the next runs need DEMO_PASSWORD)` : ''}`);
}

/**
 * Opens a session for the demo account: one login when it exists (DEMO_PASSWORD required, the password is never
 * changed), otherwise a registration, whose credentials are printed immediately.
 */
async function openSession() {
  const [existing] = await query<{ id: string }>('SELECT id FROM "User" WHERE email = $1', [DEMO_EMAIL]);
  if (existing) {
    if (!demoPassword) throw new Error(`The demo account ${DEMO_EMAIL} already exists: set DEMO_PASSWORD to its password, or use another DEMO_EMAIL.`);
    sessionToken = (await call<{ token: string }>('POST', '/auth/login', { email: DEMO_EMAIL, password: demoPassword })).token;
    return;
  }
  demoPassword ??= `Demo-${randomBytes(9).toString('base64url')}!1`;
  sessionToken = (await call<{ token: string }>('POST', '/auth/register', { email: DEMO_EMAIL, password: demoPassword, name: 'Demo' })).token;
  console.log('Registered the demo account.');
  printCredentials();
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** True when the tenant has to be created: missing among the demo user's tenants, or deleted because of --reset. */
async function prepareTenant(name: string): Promise<boolean> {
  const tenants = await call<Array<{ id: string; name: string }>>('GET', '/tenants');
  const existing = tenants.find((t) => t.name === name);
  if (existing && !process.argv.includes('--reset')) {
    console.log(`Tenant "${name}" already exists (${existing.id}); skipped. Use --reset to create it again.`);
    return false;
  }
  if (existing) {
    await deleteDemoTenant(existing.id, name);
    console.log(`Deleted tenant "${name}" (${existing.id}) and its files`);
  }
  return true;
}

async function main() {
  await checkRuleSets([prevYear, thisYear]);
  await openSession();
  try {
    if (await prepareTenant(TENANT_NAME)) await seedSeparateScheme();
    for (const demo of OTHER_SCHEMES) {
      if (await prepareTenant(demo.name)) await seedOtherScheme(demo);
    }
    console.log('\nLog in with the demo account and select a demo tenant in /setup.');
  } finally {
    printCredentials();
  }
}

/** Creates a tenant as the demo user, who becomes its member, and makes it the session's active tenant. */
async function createTenant(profile: Record<string, unknown>): Promise<string> {
  const tenant = await call<{ id: string }>('POST', '/tenants', profile);
  await call('POST', '/auth/select-tenant', { tenantId: tenant.id });
  return tenant.id;
}

/** The Gestione Separata tenant: full year data, credits and an installment plan with INPS rows. */
async function seedSeparateScheme() {
  const tenantId = await createTenant({
    name: TENANT_NAME,
    socialSecurityScheme: 'INPS_SEPARATE',
    firstName: 'Demo',
    lastName: 'Forfettario',
    fiscalCode: 'DMOFRF85A01G273U',
    birthDate: '1985-01-01',
    sex: 'M',
    birthPlace: 'Palermo',
    birthProvince: 'PA',
    vatNumber: '01234567897',
    atecoCode: '62.02',
    address: 'Via Roma 1',
    postalCode: '90133',
    city: 'Palermo',
    province: 'PA',
    activityStartYear: 2021,
    reducedRate: false,
    applyInpsSurcharge: true,
    isaSubject: true,
    viesRegistered: true,
    inpsOfficeId: '5500-palermo',
  });
  console.log(`Created tenant ${tenantId}`);

  await call('POST', '/tenants/me/bank-accounts', { name: 'Conto principale', bankName: 'Banca Demo', iban: 'IT60X0542811101000000123456', isDefault: true });
  await call('POST', '/tenants/me/payment-terms', { name: 'Bonifico 30 gg', dueDays: [30], method: 'MP05', isDefault: true });
  await call('POST', '/tenants/me/payment-terms', { name: 'Bonifico 10 gg', dueDays: [10], method: 'MP05' });
  await call('POST', '/tenants/me/payment-terms', { name: 'RiBa 30/60 gg fine mese', dueDays: [30, 60], fromMonthEnd: true, method: 'MP12' });

  const acme = await call<{ id: string }>('POST', '/customers', { kind: 'IT_B2B', businessName: 'Acme Software S.r.l.', vatNumber: '09876543217', countryCode: 'IT', address: 'Via Milano 10', postalCode: '20121', city: 'Milano', province: 'MI', country: 'IT', recipientCode: 'ABCDEF1' });
  const rossi = await call<{ id: string }>('POST', '/customers', { kind: 'IT_B2C', firstName: 'Mario', lastName: 'Rossi', fiscalCode: 'RSSMRA80A01H501U', countryCode: 'IT', address: 'Via Garibaldi 5', postalCode: '00185', city: 'Roma', province: 'RM', country: 'IT', recipientCode: '0000000' });
  const gmbh = await call<{ id: string }>('POST', '/customers', { kind: 'EU', businessName: 'Beispiel GmbH', vatNumber: 'DE123456789', countryCode: 'DE', address: 'Hauptstrasse 1', postalCode: '00000', city: 'Berlin', country: 'DE', recipientCode: 'XXXXXXX' });
  console.log('Created 3 customers');

  // Previous year: ten invoices, all collected within the year (cash basis → income of the previous year).
  const prev: Array<[number, string, number, string]> = [
    [1, acme.id, 4200, 'Sviluppo modulo gestionale — gennaio'],
    [2, acme.id, 4200, 'Sviluppo modulo gestionale — febbraio'],
    [3, gmbh.id, 3800, 'Backend API development — March'],
    [4, acme.id, 4600, 'Sviluppo modulo gestionale — aprile'],
    [5, rossi.id, 1500, 'Sito web e configurazione hosting'],
    [6, acme.id, 4600, 'Sviluppo modulo gestionale — giugno'],
    [7, gmbh.id, 5200, 'Backend API development — July'],
    [9, acme.id, 4800, 'Sviluppo modulo gestionale — settembre'],
    [10, acme.id, 4800, 'Sviluppo modulo gestionale — ottobre'],
    [11, gmbh.id, 6100, 'Backend API development — November'],
  ];
  let collectedPrev = 0;
  const receipts: Array<{ name: string; contentBase64: string }> = [];
  for (const [month, customerId, amount, description] of prev) {
    const inv = await call<{ id: string }>('POST', '/invoices', { customerId, date: iso(prevYear, month, 28), lines: [{ description, quantity: 1, unitPrice: amount }] });
    const issued = await call<{ id: string; total: string; number: string; xmlFileName: string }>('POST', `/invoices/${inv.id}/issue`, {});
    receipts.push(sdiReceipt(customerId === rossi.id ? 'MC' : 'RC', issued.xmlFileName, iso(prevYear, month, 28)));
    const payDate = month === 11 ? iso(prevYear, 12, 20) : iso(prevYear, month + 1, 15);
    await call('POST', `/invoices/${inv.id}/payments`, { date: payDate, amount: Number(issued.total) });
    collectedPrev += Number(issued.total);
    console.log(`Issued ${issued.number} (${issued.total} EUR), collected on ${payDate}`);
  }

  // Current year: invoices up to today, the last one not yet collected.
  const now = new Date();
  const cur: Array<[number, string, number, string]> = [
    [1, acme.id, 5000, 'Sviluppo e manutenzione — gennaio'],
    [2, acme.id, 5000, 'Sviluppo e manutenzione — febbraio'],
    [3, gmbh.id, 6100, 'Backend API development — March'],
    [4, acme.id, 5000, 'Sviluppo e manutenzione — aprile'],
    [5, acme.id, 5000, 'Sviluppo e manutenzione — maggio'],
    [6, rossi.id, 900, 'Assistenza sito web'],
    [7, acme.id, 5200, 'Sviluppo e manutenzione — luglio'],
    [9, acme.id, 5200, 'Sviluppo e manutenzione — settembre'],
  ];
  const current = cur.filter(([month]) => month <= now.getMonth() + 1);
  for (const [index, [month, customerId, amount, description]] of current.entries()) {
    const date = iso(thisYear, month, Math.min(28, month === now.getMonth() + 1 ? now.getDate() : 28));
    const inv = await call<{ id: string }>('POST', '/invoices', { customerId, date, lines: [{ description, quantity: 1, unitPrice: amount }] });
    const issued = await call<{ id: string; total: string; number: string; xmlFileName: string }>('POST', `/invoices/${inv.id}/issue`, {});
    // The last one stays to send, to show the transmission.
    if (index < current.length - 1) receipts.push(sdiReceipt(customerId === rossi.id ? 'MC' : 'RC', issued.xmlFileName, date));
    const paid = month < now.getMonth() + 1;
    if (paid) await call('POST', `/invoices/${inv.id}/payments`, { date: iso(thisYear, month + 1, 10), amount: Number(issued.total) });
    console.log(`Issued ${issued.number} (${issued.total} EUR)${paid ? ', collected' : ', open'}`);
  }

  await importReceipts(receipts);

  // Amounts paid during the previous year with F24 (entered by hand, as in the taxes page).
  await call('PUT', `/taxes/${prevYear}/data`, { contributionsPaid: 8500, taxAdvancesPaid: 1200, inpsAdvancesPaid: 3900, taxCredits: 0, inpsReducedRate: false });
  await call('PUT', `/taxes/${thisYear}/data`, { contributionsPaid: 0, taxAdvancesPaid: 0, inpsAdvancesPaid: 0, taxCredits: 0, inpsReducedRate: false });

  // Credits from the previous year's return, used in a zero-balance form before the installments.
  await call('POST', '/tax-credits', { section: 'TREASURY', code: '4001', referenceYear: prevYear, amount: 1500, installmentCode: '0101', description: `Credito IRPEF ${prevYear} (demo)` });
  await call('POST', '/tax-credits', { section: 'LOCAL', code: '3844', localCode: 'G273', referenceYear: prevYear, amount: 109, installmentCode: '0101', description: 'Addizionale comunale a credito (demo)' });

  // Installment plan for the previous tax year, paid this year: first available start without surcharge, five installments.
  const options = await call<{ starts: Array<{ start: string; date: string; surchargePct: number; maxInstallments: number }> }>('GET', `/installment-plans/${prevYear}/options`);
  const start = options.starts.find((s) => s.start === 'EXTENDED') ?? options.starts.find((s) => s.surchargePct === 0) ?? options.starts[0];
  if (start) {
    const installments = Math.min(5, start.maxInstallments);
    await call('POST', `/installment-plans/${prevYear}`, { start: start.start, installments, useCredits: true, creditOrder: 'INPS_FIRST' });
    console.log(`Created the ${prevYear} installment plan: start ${start.date}, ${installments} installments, credits used`);
  }

  console.log(`Done "${TENANT_NAME}". Collected in ${prevYear}: ${collectedPrev.toFixed(2)} EUR. Open /taxes?year=${prevYear} and /f24?year=${prevYear}.`);
}

interface OtherSchemeDemo {
  name: string;
  socialSecurityScheme: 'INPS_ARTISANS' | 'INPS_TRADERS' | 'PROFESSIONAL_FUND';
  lastName: string;
  fiscalCode: string;
  vatNumber: string;
  atecoCode: string;
  customer: { businessName: string; vatNumber: string; recipientCode: string };
  /** [month, amount, description] of the previous year; the same months are repeated in the current year up to today. */
  invoices: Array<[number, number, string]>;
  /** Contributions paid in the previous year, entered by hand (invented amounts): deducted in LM35. */
  contributionsPaid: number;
  /** Professional fund and rate of the contribution charged on invoices (demo values: each fund sets its own rate). */
  professionalFund?: { type: string; ratePct: number };
  /** INPS Artigiani/Commercianti: flat-rate reduction of 35% requested. */
  inpsFlatRateReduction?: boolean;
}

/** Invented 17-digit INPS codes (the real ones come from the INPS cassetto previdenziale), different per tenant and year. */
const inpsCode = (tenant: number, year: number, n: number) => `9${String(tenant).padStart(2, '0')}0000${String(year).slice(2)}${String(n).padStart(6, '0')}`.padEnd(17, '0');

const OTHER_SCHEMES: OtherSchemeDemo[] = [
  {
    name: 'Demo Artigiano',
    socialSecurityScheme: 'INPS_ARTISANS',
    lastName: 'Artigiano',
    fiscalCode: 'DMORTG82C15G273C',
    vatNumber: '02345678904',
    atecoCode: '43.21.01',
    customer: { businessName: 'Condominio Via Libertà 20', vatNumber: '03456789019', recipientCode: 'ABCDEF2' },
    invoices: [[2, 8800, 'Rifacimento impianto elettrico scala A'], [5, 9400, 'Impianto elettrico locale commerciale'], [9, 7100, 'Manutenzione quadri elettrici'], [11, 6900, 'Illuminazione parti comuni']],
    contributionsPaid: 4600,
  },
  {
    name: 'Demo Commerciante',
    socialSecurityScheme: 'INPS_TRADERS',
    lastName: 'Commerciante',
    fiscalCode: 'DMOCMM79E20G273V',
    vatNumber: '04567890126',
    atecoCode: '47.91.10',
    customer: { businessName: 'Negozio Esempio S.r.l.', vatNumber: '06789012348', recipientCode: 'ABCDEF3' },
    invoices: [[3, 16500, 'Fornitura articoli da regalo — primavera'], [6, 17200, 'Fornitura articoli da regalo — estate'], [10, 18800, 'Fornitura articoli da regalo — Natale']],
    contributionsPaid: 4700,
    inpsFlatRateReduction: true,
  },
];

/**
 * A tenant of a scheme other than the Gestione Separata: no INPS surcharge on invoices. Artigiani and Commercianti:
 * INPS codes of the year (invented), the four fixed installments of this year and an F24 plan with the INPS rows above
 * the minimum. Professional fund: contributions paid entered by hand, F24 plan with the substitute tax only, invoices
 * with the fund contribution (DatiCassaPrevidenziale), which is not revenue.
 */
async function seedOtherScheme(demo: OtherSchemeDemo) {
  const tenantId = await createTenant({
    name: demo.name,
    socialSecurityScheme: demo.socialSecurityScheme,
    firstName: 'Demo',
    lastName: demo.lastName,
    fiscalCode: demo.fiscalCode,
    vatNumber: demo.vatNumber,
    atecoCode: demo.atecoCode,
    address: 'Via Maqueda 100',
    postalCode: '90133',
    city: 'Palermo',
    province: 'PA',
    activityStartYear: 2019,
    reducedRate: false,
    applyInpsSurcharge: false,
    professionalFundType: demo.professionalFund?.type,
    professionalFundRatePct: demo.professionalFund?.ratePct,
    inpsFlatRateReduction: demo.inpsFlatRateReduction ?? false,
    inpsOfficeId: '5500-palermo',
  });
  console.log(`Created tenant "${demo.name}" ${tenantId}`);
  await call('POST', '/tenants/me/bank-accounts', { name: 'Conto principale', bankName: 'Banca Demo', iban: 'IT60X0542811101000000123456', isDefault: true });
  await call('POST', '/tenants/me/payment-terms', { name: 'Bonifico 30 gg', dueDays: [30], method: 'MP05', isDefault: true });
  const customer = await call<{ id: string }>('POST', '/customers', { kind: 'IT_B2B', ...demo.customer, countryCode: 'IT', address: 'Via Libertà 20', postalCode: '90143', city: 'Palermo', province: 'PA', country: 'IT' });

  const now = new Date();
  const receipts: Array<{ name: string; contentBase64: string }> = [];
  const dates = [
    ...demo.invoices.map(([month, amount, description]) => ({ date: iso(prevYear, month, 20), amount, description })),
    ...demo.invoices.filter(([month]) => month < now.getMonth() + 1).map(([month, amount, description]) => ({ date: iso(thisYear, month, 20), amount, description })),
  ];
  for (const { date, amount, description } of dates) {
    const inv = await call<{ id: string }>('POST', '/invoices', { customerId: customer.id, date, lines: [{ description, quantity: 1, unitPrice: amount }] });
    const issued = await call<{ id: string; total: string; xmlFileName: string }>('POST', `/invoices/${inv.id}/issue`, {});
    receipts.push(sdiReceipt('RC', issued.xmlFileName, date));
    const [y, m] = date.split('-').map(Number);
    await call('POST', `/invoices/${inv.id}/payments`, { date: m === 12 ? iso(y, 12, 28) : iso(y, m + 1, 10), amount: Number(issued.total) });
  }
  console.log(`Issued and collected ${dates.length} invoices`);
  await importReceipts(receipts);

  const selfEmployed = demo.socialSecurityScheme !== 'PROFESSIONAL_FUND';
  const n = OTHER_SCHEMES.indexOf(demo) + 1;
  const codes = (year: number) => (selfEmployed ? { inpsFixedCodes: [1, 2, 3, 4].map((i) => inpsCode(n, year, i)), inpsExcessCode: inpsCode(n, year, 5) } : {});
  // Artigiani/Commercianti: contributionsPaid are the fixed installments of the previous year paid outside the tool (demo amounts).
  await call('PUT', `/taxes/${prevYear}/data`, { contributionsPaid: demo.contributionsPaid, taxAdvancesPaid: 0, inpsAdvancesPaid: 0, taxCredits: 0, inpsReducedRate: false, ...codes(prevYear) });
  if (selfEmployed) {
    await call('PUT', `/taxes/${thisYear}/data`, { contributionsPaid: 0, taxAdvancesPaid: 0, inpsAdvancesPaid: 0, taxCredits: 0, inpsReducedRate: false, ...codes(thisYear) });
    const fixed = await call<unknown[]>('POST', `/f24/fixed-contributions/${thisYear}`);
    console.log(`Created the ${fixed.length} F24 forms of the ${thisYear} fixed installments`);
  }
  const options = await call<{ starts: Array<{ start: string; date: string; surchargePct: number; maxInstallments: number }> }>('GET', `/installment-plans/${prevYear}/options`);
  const start = options.starts.find((s) => s.surchargePct === 0) ?? options.starts[0];
  if (start) {
    await call('POST', `/installment-plans/${prevYear}`, { start: start.start, installments: 1, useCredits: false, creditOrder: 'INPS_FIRST' });
    console.log(`Created the ${prevYear} F24 plan (${selfEmployed ? 'substitute tax and INPS above the minimum' : 'substitute tax only'}), single payment on ${start.date}`);
  }
  console.log(`Done "${demo.name}".`);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
