import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ZodError } from 'zod';
import {
  buildDeadlines,
  diffRuleSets,
  DOCUMENT_REF_KEYS,
  parseFiscalRuleSet,
  refKeyFor,
  ruleFieldPaths,
  ruleSet2025,
  ruleSet2026,
  type Deadline,
  type DeadlineOptions,
  type FiscalRuleSet,
  type SourceRef,
} from '@opentax-it/fiscal-rules';
import { NEVER_ISSUED } from '../common/invoice-issue.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Rule sets shipped with the code; they are seeded as DRAFT and must be activated by an admin. */
const BUNDLED_RULE_SETS: FiscalRuleSet[] = [ruleSet2025, ruleSet2026];

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
    for (const rules of BUNDLED_RULE_SETS) {
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
    if (!row) throw new NotFoundException(`Rule set ${id} not found`);
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
    if (!row) throw new NotFoundException(`No active fiscal rule set for ${year}`);
    try {
      return parseFiscalRuleSet({ ...(row.data as object), sourceRefs: row.sourceRefs });
    } catch (e) {
      if (e instanceof ZodError) {
        const fields = e.issues.map((i) => i.path.join('.')).join(', ');
        throw new UnprocessableEntityException(
          `Active fiscal rule set ${year} v${row.version} does not match the current schema (${fields}). Seed and activate a newer version.`,
        );
      }
      throw e;
    }
  }

  async activate(id: string, userId?: string) {
    const target = await this.prisma.fiscalRuleSet.findUnique({ where: { id } });
    if (!target) throw new NotFoundException(`Rule set ${id} not found`);
    // One way only: a superseded set is never reactivated; a correction ships as a new version.
    if (target.status !== 'DRAFT' && target.status !== 'PROPOSED') throw new BadRequestException(`Rule set ${target.year} v${target.version} is ${target.status} and cannot be activated`);
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
    const [stampDutyByQuarter, profile, euInvoices] = await Promise.all([
      this.stampDutyByQuarter(tenantId, year),
      this.prisma.tenantProfile.findUnique({ where: { tenantId }, select: { viesRegistered: true, isaSubject: true } }),
      this.prisma.invoice.count({ where: { tenantId, year, status: { notIn: NEVER_ISSUED }, customer: { kind: 'EU' } } }),
    ]);
    const quarterlyIntrastat = opts.quarterlyIntrastat ?? (profile?.viesRegistered === true || euInvoices > 0);
    return buildDeadlines(rules, { ...opts, quarterlyIntrastat, stampDutyByQuarter, isaSubject: profile?.isaSubject ?? false });
  }

  /**
   * Stamp duty due per quarter from the tenant's issued e-invoices (virtual stamp flagged),
   * by document date — the basis of the AdE lists A/B (stamp duty guide, June 2026).
   */
  async stampDutyByQuarter(tenantId: string, year: number): Promise<Record<1 | 2 | 3 | 4, number>> {
    const rows = await this.prisma.invoice.findMany({
      where: { tenantId, year, virtualStamp: true, status: { notIn: NEVER_ISSUED } },
      select: { date: true, stampAmount: true },
    });
    const totals: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const r of rows) {
      const q = (Math.floor(r.date.getUTCMonth() / 3) + 1) as 1 | 2 | 3 | 4;
      totals[q] = Math.round((totals[q] + Number(r.stampAmount)) * 100) / 100;
    }
    return totals;
  }
}
