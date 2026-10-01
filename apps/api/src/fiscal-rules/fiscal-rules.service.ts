import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ZodError } from 'zod';
import {
  buildDeadlines,
  bundledRuleSets,
  diffRuleSets,
  DOCUMENT_REF_KEYS,
  parseFiscalRuleSet,
  refKeyFor,
  ruleFieldPaths,
  type Deadline,
  type DeadlineOptions,
  type FiscalRuleSet,
  type SourceRef,
} from '@opentax-it/fiscal-rules';
import { NEVER_ISSUED } from '../common/invoice-issue.js';
import { PrismaService } from '../prisma/prisma.service.js';


/** Recursively sorts object keys, so that the hash does not depend on key order (jsonb reorders keys). */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((k) => [k, canonical((value as Record<string, unknown>)[k])]));
  }
  return value;
}

function contentHash(...parts: unknown[]): string {
  return createHash('sha256').update(JSON.stringify(canonical(parts))).digest('hex');
}

@Injectable()
export class FiscalRulesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Insert bundled rule sets as DRAFT. For each year: nothing if the latest stored
   * version has the same content; otherwise a new version (never overwrites a stored
   * set, never activates). Idempotent.
   */
  async seedBundled(): Promise<Array<{ year: number; version: number }>> {
    const inserted: Array<{ year: number; version: number }> = [];
    // Rule sets shipped with the code are seeded as DRAFT and must be activated by an admin.
    for (const rules of bundledRuleSets) {
      const { sourceRefs, ...data } = rules;
      const latest = await this.prisma.fiscalRuleSet.findFirst({ where: { year: rules.year }, orderBy: { version: 'desc' } });
      if (latest && contentHash(latest.data, latest.sourceRefs) === contentHash(data, sourceRefs)) continue;
      const version = (latest?.version ?? 0) + 1;
      await this.prisma.fiscalRuleSet.create({
        data: { year: rules.year, version, status: 'DRAFT', data, sourceRefs, notes: "Fornito con l'applicazione" },
      });
      inserted.push({ year: rules.year, version });
    }
    return inserted;
  }

  async listByYear(year: number) {
    return this.prisma.fiscalRuleSet.findMany({
      where: { year },
      orderBy: { version: 'desc' },
      select: { id: true, year: true, version: true, status: true, activatedAt: true, notes: true, createdAt: true },
    });
  }

  /**
   * A stored rule set as read by a person: every value with the sourceRefs entry that covers it,
   * the entries that are not values, and, when it is not the active set, what changes from the
   * active set of the same year. Works on the stored JSON, so older sets are shown as they are.
   */
  async describe(id: string) {
    const row = await this.prisma.fiscalRuleSet.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Set di regole non trovato');
    const data = row.data as object;
    const sourceRefs = row.sourceRefs as Record<string, SourceRef>;
    const fields = [...ruleFieldPaths(data)].map(([path, value]) => {
      const refKey = refKeyFor(sourceRefs, path);
      return { path, value, refKey: refKey ?? null, ref: refKey ? sourceRefs[refKey] : null };
    });
    const documents = Object.keys(sourceRefs).filter((key) => DOCUMENT_REF_KEYS.has(key)).map((key) => ({ key, ref: sourceRefs[key] }));
    const active = row.status === 'ACTIVE' ? null : await this.prisma.fiscalRuleSet.findFirst({ where: { year: row.year, status: 'ACTIVE' }, orderBy: { version: 'desc' } });
    const comparison = active
      ? { against: { id: active.id, version: active.version }, ...diffRuleSets({ data: active.data as object, sourceRefs: active.sourceRefs as Record<string, unknown> }, { data, sourceRefs }) }
      : null;
    const { id: _id, data: _data, sourceRefs: _refs, ...meta } = row;
    return { id: row.id, ...meta, fields, documents, comparison };
  }

  /**
   * The ACTIVE rule set for a year, parsed against the current schema. Throws 404 if none
   * is active and 422 if the stored set no longer matches the schema (a newer bundled
   * version must be seeded and activated by an admin).
   */
  async getActive(year: number): Promise<FiscalRuleSet> {
    const row = await this.prisma.fiscalRuleSet.findFirst({ where: { year, status: 'ACTIVE' }, orderBy: { version: 'desc' } });
    if (!row) throw new NotFoundException(`Nessun set di regole attivo per il ${year}`);
    try {
      return parseFiscalRuleSet({ ...(row.data as object), sourceRefs: row.sourceRefs });
    } catch (e) {
      if (e instanceof ZodError) {
        const fields = e.issues.map((i) => i.path.join('.')).join(', ');
        throw new UnprocessableEntityException(
          `Il set di regole attivo ${year} v${row.version} è di una versione precedente dell'applicazione (campi: ${fields}): un amministratore carica e attiva quello nuovo in Regole fiscali.`,
        );
      }
      throw e;
    }
  }

  async activate(id: string, userId?: string) {
    const target = await this.prisma.fiscalRuleSet.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('Set di regole non trovato');
    // One way only: a superseded set is never reactivated; a correction ships as a new version.
    if (target.status !== 'DRAFT' && target.status !== 'PROPOSED') throw new BadRequestException(`Il set di regole ${target.year} v${target.version} è già attivo o superato e non si può attivare`);
    return this.prisma.$transaction(async (tx) => {
      await tx.fiscalRuleSet.updateMany({ where: { year: target.year, status: 'ACTIVE' }, data: { status: 'SUPERSEDED' } });
      return tx.fiscalRuleSet.update({
        where: { id },
        data: { status: 'ACTIVE', activatedAt: new Date(), activatedById: userId ?? null },
      });
    });
  }

  /**
   * Deadlines for a year. With a tenant: stamp duty deferrals from its invoices, and Intrastat
   * only when the profile is VIES-registered or invoices were issued to EU customers in the year
   * (Circ. AdE 10/E/2016 §4.1.2: services to EU taxable persons require the Intrastat list).
   */
  async deadlines(year: number, opts: DeadlineOptions, tenantId?: string): Promise<Deadline[]> {
    const rules = await this.getActive(year);
    if (!tenantId) return buildDeadlines(rules, opts);
    const [computed, confirmed, profile, euInvoices] = await Promise.all([
      this.stampDutyByQuarter(tenantId, year),
      this.prisma.stampDutyPeriod.findMany({ where: { tenantId, year, dueAmount: { not: null } }, select: { quarter: true, dueAmount: true } }),
      this.prisma.tenantProfile.findUnique({ where: { tenantId }, select: { viesRegistered: true, isaSubject: true, socialSecurityScheme: true } }),
      this.prisma.invoice.count({ where: { tenantId, year, status: { notIn: NEVER_ISSUED }, customer: { kind: 'EU' } } }),
    ]);
    // The amount the AdE shows on the portal, once saved, replaces the estimate (AdE stamp duty guide, June 2026).
    const stampDutyByQuarter = { ...computed.amounts };
    for (const p of confirmed) stampDutyByQuarter[p.quarter as 1 | 2 | 3 | 4] = Number(p.dueAmount);
    const stampDutyEstimatedQuarters = computed.estimatedQuarters.filter((q) => !confirmed.some((p) => p.quarter === q));
    const quarterlyIntrastat = opts.quarterlyIntrastat ?? (profile?.viesRegistered === true || euInvoices > 0);
    return buildDeadlines(rules, { ...opts, quarterlyIntrastat, stampDutyByQuarter, stampDutyEstimatedQuarters, isaSubject: profile?.isaSubject ?? false, contributionScheme: profile?.socialSecurityScheme });
  }

  /**
   * Stamp duty due per quarter from the tenant's e-invoices with the virtual stamp, the basis of the AdE lists A/B.
   * The quarter is the one of the delivery date in the RC or of the date the invoice was made available in the MC
   * ("una fattura elettronica datata e trasmessa [...] il 30 marzo, la cui data di consegna attestata nella ricevuta
   * è il 1° aprile, viene considerata [...] tra le fatture relative al secondo trimestre", AdE stamp duty guide, June
   * 2026). Invoices without that date yet (not sent, waiting for the outcome, imported without receipts) are placed by
   * their own date, and their quarters are returned as estimated.
   */
  async stampDutyByQuarter(tenantId: string, year: number): Promise<{ amounts: Record<1 | 2 | 3 | 4, number>; estimatedQuarters: number[] }> {
    const from = new Date(Date.UTC(year, 0, 1));
    const to = new Date(Date.UTC(year + 1, 0, 1));
    const rows = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        virtualStamp: true,
        status: { notIn: NEVER_ISSUED },
        OR: [{ sdiDeliveredOn: { gte: from, lt: to } }, { sdiDeliveredOn: null, date: { gte: from, lt: to } }],
      },
      select: { date: true, sdiDeliveredOn: true, stampAmount: true },
    });
    const amounts: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const estimated = new Set<number>();
    for (const r of rows) {
      const day = r.sdiDeliveredOn ?? r.date;
      const q = (Math.floor(day.getUTCMonth() / 3) + 1) as 1 | 2 | 3 | 4;
      amounts[q] = Math.round((amounts[q] + Number(r.stampAmount)) * 100) / 100;
      if (!r.sdiDeliveredOn) estimated.add(q);
    }
    return { amounts, estimatedQuarters: [...estimated].sort() };
  }
}
