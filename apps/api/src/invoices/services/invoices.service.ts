import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { buildInvoiceXml, INPS_SOCIAL_SECURITY_FUND, invoiceFileName, nextFileSequence, parseInvoiceXml, type FlatRateInvoice } from '@opentax-it/fatturapa';
import { contributionScheme, customerTreatment, thresholdOutlook, type FiscalRuleSet, type ThresholdOutlook } from '@opentax-it/fiscal-rules';
import { NEVER_ISSUED } from '../../common/invoice-issue.js';
import { REVENUE_INVOICE_SELECT, revenueShare } from '../../common/revenue.js';
import { FUTURE_INVOICE_DATE, todayInItaly } from '../../common/italian-date.js';
import { FiscalRulesService } from '../../fiscal-rules/fiscal-rules.service.js';
import { Prisma, type Customer, type Invoice, type InvoiceLine, type TenantProfile } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { StorageService } from '../../storage/storage.service.js';
import { TenantsService } from '../../tenants/tenants.service.js';
import { isCorrection, replacementNote } from './invoice-correction.js';
import { InvoicesPdfService } from './invoices-pdf.service.js';
import type { IssueInvoiceDto } from '../dto/request/issue-invoice.dto.js';
import type { CourtesyInvoicePayment } from '../types/courtesy-invoice-payment.js';
import { paymentSchedule } from '../../common/payment-schedule.js';
import type { ListInvoicesQueryDto } from '../dto/request/list-invoices-query.dto.js';
import type { SaveInvoiceDto } from '../dto/request/save-invoice.dto.js';
import type { CourtesyInvoice } from '../types/courtesy-invoice.js';

/**
 * Invoices under the flat-rate regime.
 *
 * - No VAT is charged (L. 190/2014 art. 1 par. 58 lett. a); lines carry Natura N2.2 for
 *   domestic operations and N2.1 for art. 7-ter operations with non-resident customers
 *   (par. 58 lett. d); DPR 633/72 art. 21 par. 6-bis annotations).
 * - Mandatory notes: flat-rate regime (par. 54-89) and no withholding (par. 67) — AdE
 *   e-invoice guide, December 2025.
 * - Stamp duty EUR 2 when non-subject operations exceed EUR 77.47 (DM 17/06/2014 art. 6;
 *   AdE stamp duty guide), included in the document total.
 * - Optional 4% INPS surcharge (L. 662/1996 art. 1 par. 212) exposed as DatiCassaPrevidenziale TC22.
 * - Numbering: progressive per year and document type; the issue date must be within
 *   12 days of the operation (DPR 633/72 art. 21 par. 4) — enforced by the caller's date —
 *   and not in the future (SDI error 00403).
 *
 * All thresholds/rates/texts come from the ACTIVE FiscalRuleSet of the invoice year.
 */

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type InvoiceWithRelations = Invoice & { lines: InvoiceLine[]; customer: Customer; replacedBy: { id: string; number: string } | null };

/** The invoice that replaces a rejected one, shown with it. */
const REPLACED_BY = { select: { id: true, number: true } } as const;

/**
 * Methods paid into the supplier's account, for which DatiPagamento carries the bank (IBAN: "il conto corrente del
 * beneficiario", spec 1.9.1): bank transfer and SEPA Direct Debit. The spec allows the IBAN with any method;
 * leaving it out for cash or card is a choice of this app, so that the customer is not shown an account to use.
 */
export const usesBankAccount = (method: string) => method === 'MP05' || method === 'MP19';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rules: FiscalRulesService,
    private readonly tenants: TenantsService,
    private readonly storage: StorageService,
    private readonly pdfService: InvoicesPdfService,
  ) {}

  /** Documents with what was collected on each, in the document currency and positive (refunds of credit notes too). */
  async list(tenantId: string, q: ListInvoicesQueryDto) {
    const where = { tenantId, ...(q.year ? { year: q.year } : {}), ...(q.status ? { status: q.status } : {}) };
    const [invoices, sums] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { customer: { select: { id: true, businessName: true, firstName: true, lastName: true, kind: true } }, replacedBy: REPLACED_BY },
        orderBy: [{ date: 'desc' }, { sequence: 'desc' }],
      }),
      this.prisma.payment.groupBy({ by: ['invoiceId'], where: { tenantId, invoice: where }, _sum: { amount: true } }),
    ]);
    const recorded = new Map(sums.map((s) => [s.invoiceId, Number(s._sum.amount ?? 0)]));
    // Credit-note refunds are recorded as negative collections (payments.service.ts).
    return invoices.map((i) => ({ ...i, collected: Math.abs(Math.round((recorded.get(i.id) ?? 0) * 100) / 100) }));
  }

  async years(tenantId: string): Promise<number[]> {
    const rows = await this.prisma.invoice.findMany({ where: { tenantId }, distinct: ['year'], select: { year: true }, orderBy: { year: 'desc' } });
    return rows.map((r) => r.year);
  }

  async get(tenantId: string, id: string): Promise<InvoiceWithRelations> {
    const inv = await this.prisma.invoice.findFirst({ where: { id, tenantId }, include: { lines: { orderBy: { lineNumber: 'asc' } }, customer: true, replacedBy: REPLACED_BY } });
    if (!inv) throw new NotFoundException('Fattura non trovata');
    return inv;
  }

  /** The invoice whose SDI file has this name, if any (unique per tenant: see the Invoice model). */
  findByXmlFileName(tenantId: string, xmlFileName: string): Promise<Invoice | null> {
    return this.prisma.invoice.findUnique({ where: { tenantId_xmlFileName: { tenantId, xmlFileName } } });
  }

  /**
   * Compute derived amounts and texts from the DTO, the customer and the active rule set. `replacesInvoiceId`: the
   * rejected invoice this one replaces, whose link goes in the notes (see replacementNote).
   */
  private async prepare(tenantId: string, dto: SaveInvoiceDto, replacesInvoiceId?: string | null) {
    const year = Number(dto.date.slice(0, 4));
    const rules = await this.rules.getActive(year);
    const { profile } = await this.tenants.getWithProfile(tenantId);
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId } });
    if (!customer) throw new BadRequestException('Cliente non trovato');

    const type = dto.type ?? 'TD01';
    if ((type === 'TD04' || type === 'TD05') && !dto.refInvoiceId) throw new BadRequestException('Una nota di credito o di debito deve indicare la fattura a cui si riferisce');
    if (dto.refInvoiceId) {
      const ref = await this.prisma.invoice.findFirst({ where: { id: dto.refInvoiceId, tenantId } });
      if (!ref) throw new BadRequestException('La fattura di riferimento non esiste');
    }
    const terms = dto.paymentTermsId
      ? await this.prisma.paymentTerms.findFirst({ where: { id: dto.paymentTermsId, tenantId } })
      : await this.prisma.paymentTerms.findFirst({ where: { tenantId, isDefault: true } });
    if (dto.paymentTermsId && !terms) throw new BadRequestException('Profilo di scadenza non trovato');
    if (dto.bankAccountId) {
      const bank = await this.prisma.bankAccount.findFirst({ where: { id: dto.bankAccountId, tenantId } });
      if (!bank) throw new BadRequestException('Conto bancario non trovato');
    }

    const lines = dto.lines.map((l, i) => {
      const quantity = l.quantity ?? 1;
      return { lineNumber: i + 1, description: l.description, quantity, unit: l.unit ?? null, unitPrice: l.unitPrice, totalPrice: round2(quantity * l.unitPrice) };
    });
    const linesTotal = round2(lines.reduce((s, l) => s + l.totalPrice, 0));

    // Foreign currency: the amounts are converted at the rate of the day of the operation or of the invoice
    // (DPR 633/72 art. 13 par. 4); never assume 1. exchangeRate = EUR per unit of the invoice currency.
    const currency = (dto.currency ?? customer.currency).toUpperCase();
    const exchangeRate = currency === 'EUR' ? 1 : dto.exchangeRate;
    if (!exchangeRate) throw new BadRequestException(`Fattura in ${currency}: indica il cambio del giorno dell'operazione o della fattura (art. 13 c. 4 DPR 633/72)`);

    const applySurcharge = dto.applyInpsSurcharge ?? profile.applyInpsSurcharge;
    // The 4% surcharge is for the Gestione Separata only (L. 662/1996 art. 1 par. 212; contribution-schemes.ts).
    if (applySurcharge && contributionScheme(profile.socialSecurityScheme)?.inpsSurcharge !== true) {
      throw new BadRequestException('La rivalsa INPS del 4% spetta solo agli iscritti alla Gestione Separata: la gestione previdenziale del profilo non la prevede');
    }
    const inpsSurcharge = applySurcharge ? round2((linesTotal * rules.inps.surchargePct) / 100) : 0;
    // The laws of the funds charge the contribution on "tutti i corrispettivi rientranti nel volume annuale d'affari ai
    // fini dell'IVA" (e.g. L. 576/1980 art. 11); some funds exclude some invoices (Inarcassa: art. 21 par. 6-bis
    // operations), so the draft can leave it out.
    const fund = dto.applyProfessionalFund === false ? undefined : professionalFundOf(profile);
    const professionalFundContribution = fund ? round2((linesTotal * fund.ratePct) / 100) : 0;

    // Natura, annotation and INVCONT by place of supply (art. 7-ter / 7-septies): see customerTreatment.
    const treatment = customerTreatment(rules, customer.kind, customer.art7SeptiesServices);
    const vatNature = treatment.nature === 'N2.1' ? 'N2_1' : 'N2_2';

    // Stamp duty applies when the amount not subject to VAT exceeds the threshold: "le fatture, quando la somma indicata
    // è superiore a 77,47 euro e non è soggetta ad IVA" (AdE ruling 428/2022). For a flat-rate taxpayer the whole invoice
    // is not subject to VAT, surcharge and fund contribution included; no source names them explicitly.
    const nonSubjectTotal = round2(linesTotal + inpsSurcharge + professionalFundContribution);
    const virtualStamp = nonSubjectTotal > rules.stampDuty.threshold;
    const stampAmount = virtualStamp ? rules.stampDuty.amount : 0;
    const total = round2(nonSubjectTotal + stampAmount);

    const notes = [rules.eInvoice.regimeNote, rules.eInvoice.noWithholdingNote];
    if (treatment.annotation) notes.push(treatment.annotation);
    if (replacesInvoiceId) notes.push(await this.replacementNoteOf(tenantId, replacesInvoiceId));

    return {
      rules,
      profile,
      customer,
      data: {
        customerId: customer.id,
        type,
        year,
        date: new Date(`${dto.date}T00:00:00Z`),
        currency,
        exchangeRate,
        vatNature: vatNature as Invoice['vatNature'],
        taxableAmount: linesTotal,
        inpsSurcharge,
        professionalFundType: fund?.type ?? null,
        professionalFundRatePct: fund?.ratePct ?? null,
        professionalFundContribution,
        virtualStamp,
        stampAmount,
        total,
        notes,
        refInvoiceId: dto.refInvoiceId ?? null,
        paymentTermsId: dto.paymentTermsId ?? null,
        bankAccountId: dto.bankAccountId ?? null,
        paymentMethod: dto.paymentMethod ?? terms?.method ?? null,
        internalNotes: dto.internalNotes ?? null,
      },
      lines,
      payment: dto.payment,
    };
  }

  async create(tenantId: string, dto: SaveInvoiceDto) {
    const p = await this.prepare(tenantId, dto);
    return this.prisma.invoice.create({
      data: { tenantId, ...p.data, number: '', status: 'DRAFT', lines: { create: p.lines } },
      include: { lines: true, customer: true },
    });
  }

  async update(tenantId: string, id: string, dto: SaveInvoiceDto) {
    const existing = await this.get(tenantId, id);
    if (existing.status !== 'DRAFT') throw new BadRequestException('Si possono modificare solo le bozze');
    // A rejected invoice is sent again "con la data ed il numero del documento originario" (Circ. 13/E/2018 §1.6).
    if (isCorrection(existing) && (dto.date !== existing.date.toISOString().slice(0, 10) || (dto.type ?? 'TD01') !== existing.type)) {
      throw new BadRequestException('La fattura scartata si reinvia con lo stesso numero, la stessa data e lo stesso tipo di documento.');
    }
    const p = await this.prepare(tenantId, dto, existing.replacesInvoiceId);
    return this.prisma.invoice.update({
      where: { id },
      data: { ...p.data, lines: { deleteMany: {}, create: p.lines } },
      include: { lines: true, customer: true },
    });
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.get(tenantId, id);
    if (existing.status !== 'DRAFT') throw new BadRequestException('Si possono eliminare solo le bozze');
    if (isCorrection(existing)) throw new BadRequestException('La fattura scartata ha già un numero: correggila e reinviala invece di eliminarla.');
    await this.prisma.invoice.delete({ where: { id } });
  }

  /**
   * Issue a draft: assign the next progressive number for year/type, build the FatturaPA
   * XML, store it and mark the invoice ISSUED. Numbering and file writing happen in one
   * transaction so that a failed XML never consumes a number. A per-tenant advisory lock
   * serializes concurrent issues (double click, two tabs, invoice and credit note together),
   * which would otherwise read the same progressive and transmission numbers.
   */
  /**
   * Revenue thresholds for the current year (L. 190/2014 par. 54 and 71), on the cash basis: collected
   * revenue, plus issued documents not yet collected and, with `invoiceId`, the draft being issued, all without
   * professional fund contributions (common/revenue.ts).
   * Credit notes are left out of the outstanding amount, so the projection errs on the high side.
   */
  async thresholds(tenantId: string, invoiceId?: string): Promise<ThresholdOutlook> {
    const year = new Date().getFullYear();
    const [rules, { profile }, collected, open, draft] = await Promise.all([
      this.rules.getActive(year),
      this.tenants.getWithProfile(tenantId),
      this.prisma.payment.findMany({
        where: { tenantId, date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
        select: { amountEur: true, invoice: { select: REVENUE_INVOICE_SELECT } },
      }),
      this.prisma.invoice.findMany({
        where: { tenantId, status: { notIn: NEVER_ISSUED }, type: { not: 'TD04' } },
        select: { ...REVENUE_INVOICE_SELECT, exchangeRate: true, payments: { select: { amountEur: true } } },
      }),
      invoiceId ? this.get(tenantId, invoiceId) : Promise.resolve(null),
    ]);
    const outstanding = open.reduce((s, i) => {
      const due = Number(i.total) * Number(i.exchangeRate) - i.payments.reduce((p, x) => p + Number(x.amountEur), 0);
      return s + Math.max(0, revenueShare(due, i));
    }, 0);
    return thresholdOutlook(rules, {
      collectedRevenue: round2(collected.reduce((s, p) => s + revenueShare(Number(p.amountEur), p.invoice), 0)),
      outstanding,
      invoiceTotal: draft && draft.type !== 'TD04' ? revenueShare(Number(draft.total) * Number(draft.exchangeRate), draft) : 0,
      personalLimit: profile.revenueLimit !== null ? Number(profile.revenueLimit) : null,
    });
  }

  /**
   * Reopens an invoice rejected by SDI for correction: it "si considera non emessa" and is sent again "preferibilmente
   * [...] entro cinque giorni dalla notifica di scarto [...] con la data ed il numero del documento originario" (Circ.
   * AdE 13/E/2018 §1.6), under a new file name (a duplicate name is rejected with error 00002, Spec. 1.9.1). The draft
   * keeps number, date and type; its old file stays with its transmission, so a late receipt of that file no longer
   * reaches the invoice.
   */
  async reopenForCorrection(tenantId: string, id: string) {
    const existing = await this.get(tenantId, id);
    if (existing.status !== 'REJECTED') throw new BadRequestException('Si possono correggere e reinviare solo le fatture scartate dallo SDI.');
    if (existing.imported) throw new BadRequestException('Le fatture importate si correggono con lo strumento da cui sono state inviate.');
    if (existing.replacedBy) throw new BadRequestException(`La fattura è già stata sostituita dalla ${existing.replacedBy.number || 'bozza'} con un nuovo numero.`);
    await this.prisma.invoice.updateMany({ where: { id, tenantId, status: 'REJECTED' }, data: { status: 'DRAFT', xmlFileName: null, xmlPath: null, sdiDeliveredOn: null } });
    return this.get(tenantId, id);
  }

  /**
   * When the rejected invoice cannot be sent again with its number and date: a new draft, dated today, that replaces
   * it, with the link in the notes (Circ. AdE 13/E/2018 §1.6, a). The rejected invoice stays rejected, never issued;
   * the draft takes the next number when issued. Amounts are recomputed with the rules of the new date.
   */
  async createReplacement(tenantId: string, id: string) {
    const rejected = await this.get(tenantId, id);
    if (rejected.status !== 'REJECTED') throw new BadRequestException('Si possono sostituire solo le fatture scartate dallo SDI.');
    if (rejected.imported) throw new BadRequestException('Le fatture importate si sostituiscono con lo strumento da cui sono state inviate.');
    if (rejected.replacedBy) throw new ConflictException('La fattura scartata ha già una fattura che la sostituisce.');
    const dto: SaveInvoiceDto = {
      customerId: rejected.customerId,
      type: rejected.type,
      date: todayInItaly(),
      currency: rejected.currency,
      // The rate stays the one of the operation (DPR 633/72 art. 13 c. 4); it can be changed on the draft.
      exchangeRate: rejected.currency === 'EUR' ? undefined : Number(rejected.exchangeRate),
      lines: rejected.lines.map((l) => ({ description: l.description, quantity: Number(l.quantity), unit: l.unit ?? undefined, unitPrice: Number(l.unitPrice) })),
      applyInpsSurcharge: Number(rejected.inpsSurcharge) > 0,
      applyProfessionalFund: Number(rejected.professionalFundContribution) > 0,
      refInvoiceId: rejected.refInvoiceId ?? undefined,
      paymentTermsId: rejected.paymentTermsId ?? undefined,
      bankAccountId: rejected.bankAccountId ?? undefined,
      paymentMethod: rejected.paymentMethod ?? undefined,
      internalNotes: rejected.internalNotes ?? undefined,
    };
    const p = await this.prepare(tenantId, dto, rejected.id);
    try {
      return await this.prisma.invoice.create({
        data: { tenantId, ...p.data, number: '', status: 'DRAFT', replacesInvoiceId: rejected.id, lines: { create: p.lines } },
        include: { lines: true, customer: true, replacedBy: REPLACED_BY },
      });
    } catch (err) {
      // Two requests at once: the unique link lets only one through.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') throw new ConflictException('La fattura scartata ha già una fattura che la sostituisce.');
      throw err;
    }
  }

  /** Link to the rejected invoice for the notes of the one replacing it, with the IdentificativoSdI of the rejected file. */
  private async replacementNoteOf(tenantId: string, rejectedId: string): Promise<string> {
    const rejected = await this.prisma.invoice.findFirst({ where: { id: rejectedId, tenantId }, select: { number: true, date: true } });
    if (!rejected) throw new BadRequestException('La fattura scartata da sostituire non esiste più.');
    const transmission = await this.prisma.sdiTransmission.findFirst({ where: { invoiceId: rejectedId, status: 'SDI_REJECTED' }, orderBy: { createdAt: 'desc' }, select: { sdiId: true } });
    return replacementNote(rejected, transmission?.sdiId ?? null);
  }

  async issue(tenantId: string, id: string, dto?: IssueInvoiceDto) {
    const existing = await this.get(tenantId, id);
    if (existing.status !== 'DRAFT') throw new BadRequestException('La fattura è già stata emessa');
    // Invoices to public administrations must be signed with a qualified certificate (fatturapa.gov.it,
    // "Firmare la FatturaPA": CAdES .xml.p7m or XAdES): signing is not supported yet (see TODO.md).
    if (existing.customer?.kind === 'IT_PA') {
      throw new BadRequestException('Le fatture verso la pubblica amministrazione vanno firmate con un certificato di firma qualificata (CAdES o XAdES): la firma non è ancora supportata, emetti questa fattura con un altro strumento');
    }
    // SDI rejects an invoice dated after its receipt (error 00403): the date must not be in the future.
    if (existing.date.toISOString().slice(0, 10) > todayInItaly()) throw new BadRequestException(FUTURE_INVOICE_DATE);
    if (!dto?.confirmThresholds) {
      const t = await this.thresholds(tenantId, id);
      const eur = (n: number | null) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: 'always' }).format(n ?? 0);
      if (t.projectedOverExit) throw new ConflictException(`Con questa fattura incassato e da incassare nell'anno arrivano a ${eur(t.projected)}, oltre ${eur(t.exitThreshold)}: se incassati nell'anno il regime forfettario cessa subito e l'IVA è dovuta dalla fattura che fa superare la soglia (L. 190/2014 c. 71). Conferma per emettere comunque.`);
      if (t.projectedOverPersonalLimit) throw new ConflictException(`Con questa fattura incassato e da incassare nell'anno arrivano a ${eur(t.projected)}, oltre il tuo limite personale di ${eur(t.personalLimit)}. Conferma per emettere comunque.`);
    }
    const rules = await this.rules.getActive(existing.year);
    const { profile } = await this.tenants.getWithProfile(tenantId);

    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`issue:${tenantId}`}))`;
      // Re-read after the lock: a concurrent request may have issued this draft meanwhile.
      const current = await tx.invoice.findFirst({ where: { id, tenantId }, select: { status: true } });
      if (current?.status !== 'DRAFT') throw new BadRequestException('La fattura è già stata emessa');

      // A rejected invoice being corrected keeps its number; otherwise the next one. Numbered drafts (corrections)
      // still hold their sequence, so they count here.
      const last = await tx.invoice.aggregate({ where: { tenantId, year: existing.year, type: existing.type, sequence: { not: null } }, _max: { sequence: true } });
      const sequence = existing.sequence ?? (last._max.sequence ?? 0) + 1;
      // Separate series per document type; TD04/TD05 get an explicit prefix (Numero: Basic Latin, max 20 chars).
      const prefix = existing.type === 'TD04' ? 'NC-' : existing.type === 'TD05' ? 'ND-' : '';
      const number = `${prefix}${sequence}/${existing.year}`;
      // File progressive above every name already used with this fiscal code (issued, imported, or sent before a
      // rejection) and the configured start: a duplicate name is rejected by SDI with error 00002 (spec 1.9.1 §1.2.2).
      const [invoiceFiles, sentFiles] = await Promise.all([
        tx.invoice.findMany({ where: { tenantId, xmlFileName: { not: null } }, select: { xmlFileName: true } }),
        tx.sdiTransmission.findMany({ where: { invoice: { tenantId } }, select: { fileName: true } }),
      ]);
      const used = [...invoiceFiles.map((u) => u.xmlFileName ?? ''), ...sentFiles.map((t) => t.fileName)];
      const transmissionSeq = nextFileSequence(used, profile.country, profile.fiscalCode, profile.sdiFileProgressiveStart ?? undefined);

      const refInvoice = existing.refInvoiceId ? await tx.invoice.findFirst({ where: { id: existing.refInvoiceId, tenantId } }) : null;
      // The issue form replaces due date and IBAN (an emptied field leaves it out); the method stays the one chosen on the
      // draft. The due date replaces the draft's only when the terms have a single installment.
      const fromDraft = await this.paymentFromTerms(tenantId, existing);
      const payment: CourtesyInvoicePayment | undefined = dto?.payment
        ? {
            method: dto.payment.method ?? fromDraft?.method,
            iban: dto.payment.iban,
            bic: dto.payment.bic,
            installments: fromDraft && fromDraft.installments.length > 1 ? fromDraft.installments : [{ dueDate: dto.payment.dueDate, amount: Number(existing.total) }],
          }
        : fromDraft;
      const model = this.toFatturaPa({ ...existing, number }, profile, rules, transmissionSeq, refInvoice, payment);
      const xml = buildInvoiceXml(model);
      const xmlFileName = invoiceFileName(profile.country, profile.fiscalCode, transmissionSeq);
      const xmlPath = `${tenantId}/invoices/${existing.year}/${xmlFileName}`;

      const issued = await tx.invoice.update({
        where: { id },
        data: { sequence, number, status: 'ISSUED', xmlFileName, xmlPath, paymentMethod: payment ? (payment.method ?? 'MP05') : null },
        include: { lines: true, customer: true },
      });
      // Last step: a failed write rolls the transaction back. The file may replace one left by a
      // transaction that failed after writing, whose name was never recorded.
      await this.storage.write(xmlPath, xml);
      return issued;
    });
  }

  /** Payment of a draft as it will be written at issue: method, bank and installments from its payment terms. */
  async draftPayment(tenantId: string, id: string): Promise<CourtesyInvoicePayment | null> {
    const inv = await this.get(tenantId, id);
    return (await this.paymentFromTerms(tenantId, inv)) ?? null;
  }

  /**
   * DatiPagamento of a draft: method chosen on the draft (else the one of its payment terms); installments from the
   * payment terms (or the tenant default terms, payment-schedule.ts); bank = the invoice's bank account, else the
   * tenant default bank, only for the methods paid into the supplier's account.
   */
  private async paymentFromTerms(tenantId: string, inv: Invoice): Promise<CourtesyInvoicePayment | undefined> {
    const terms = inv.paymentTermsId
      ? await this.prisma.paymentTerms.findFirst({ where: { id: inv.paymentTermsId, tenantId } })
      : await this.prisma.paymentTerms.findFirst({ where: { tenantId, isDefault: true } });
    const method = inv.paymentMethod ?? terms?.method ?? 'MP05';
    const bank = !usesBankAccount(method)
      ? null
      : inv.bankAccountId
        ? await this.prisma.bankAccount.findFirst({ where: { id: inv.bankAccountId, tenantId } })
        : await this.prisma.bankAccount.findFirst({ where: { tenantId, isDefault: true } });
    if (!terms && !bank && !inv.paymentMethod) return undefined;
    const total = Number(inv.total);
    const installments = terms ? paymentSchedule(inv.date.toISOString().slice(0, 10), total, terms) : [{ amount: total }];
    return { method, installments, iban: bank?.iban, bic: bank?.bic ?? undefined };
  }

  async xml(tenantId: string, id: string): Promise<{ fileName: string; content: string }> {
    const inv = await this.get(tenantId, id);
    if (!inv.xmlPath || !inv.xmlFileName) throw new NotFoundException('La fattura non ha ancora un XML: non è stata emessa');
    return { fileName: inv.xmlFileName, content: (await this.storage.read(inv.xmlPath)).toString('utf8') };
  }

  /**
   * Returns unified courtesy copy data for preview and PDF generation.
   * If the invoice is issued and has an XML file stored, it parses the XML so the
   * courtesy copy strictly matches the electronic invoice sent to SDI (even if
   * the tenant bank account or profile changed later). For draft invoices, it
   * reconstructs the data from the database.
   */
  async preview(tenantId: string, id: string): Promise<CourtesyInvoice> {
    const inv = await this.get(tenantId, id);

    if (inv.status !== 'DRAFT') {
      if (!inv.xmlPath) {
        throw new UnprocessableEntityException('Il file XML della fattura non è stato trovato nell\'archivio');
      }
      try {
        const xmlBuffer = await this.storage.read(inv.xmlPath);
        const p = parseInvoiceXml(xmlBuffer.toString('utf8'));
        if (!p.supplier.taxRegime) {
          throw new UnprocessableEntityException('Nell\'XML della fattura manca il RegimeFiscale');
        }

        const supplierName = p.supplier.businessName || `${p.supplier.firstName ?? ''} ${p.supplier.lastName ?? ''}`.trim();
        const customerName = p.customer.businessName || `${p.customer.firstName ?? ''} ${p.customer.lastName ?? ''}`.trim();

        const lines = p.lines.map((l, i) => ({
          lineNumber: l.lineNumber ?? i + 1,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
          totalPrice: l.totalPrice,
          vatRatePct: l.vatRatePct,
          vatNature: l.nature ?? (p.summaryNatures[0] || 'N2.2'),
        }));

        const linesTotal = lines.reduce((s, l) => s + l.totalPrice, 0);
        // The INPS block is the surcharge; any other TipoCassa is a professional fund contribution.
        const inpsFund = p.socialSecurityFunds.find((f) => f.type === INPS_SOCIAL_SECURITY_FUND);
        const otherFund = p.socialSecurityFunds.find((f) => f.type !== INPS_SOCIAL_SECURITY_FUND);
        const taxableAmount = inpsFund?.taxable ?? linesTotal;
        const inpsSurcharge = inpsFund?.amount ?? 0;
        const inpsRatePct = inpsFund?.ratePct;
        const virtualStamp = Boolean(p.stampDuty?.virtual);
        const stampAmount = p.stampDuty?.amount ?? 0;
        const total = p.documentTotal ?? round2(taxableAmount + inpsSurcharge + (otherFund?.amount ?? 0) + stampAmount);

        // One entry per DettaglioPagamento of the XML (installments), with the method and IBAN of the first.
        const firstPayment = p.payments[0];
        const payment = firstPayment
          ? {
              method: firstPayment.method,
              iban: firstPayment.iban,
              installments: p.payments.map((x) => ({ dueDate: x.dueDate, amount: x.amount ?? 0 })),
            }
          : undefined;

        return {
          id: inv.id,
          documentType: p.documentType || inv.type,
          number: p.number || inv.number,
          date: p.date,
          currency: p.currency || inv.currency,
          isDraft: false,
          status: inv.status,
          supplier: {
            name: supplierName,
            taxRegime: p.supplier.taxRegime,
            vatNumber: p.supplier.vatNumber,
            fiscalCode: p.supplier.fiscalCode,
            address: p.supplier.address ?? '',
            postalCode: p.supplier.postalCode ?? '',
            city: p.supplier.city ?? '',
            province: p.supplier.province ?? '',
            country: p.supplier.country ?? 'IT',
            pec: undefined,
          },
          customer: {
            name: customerName,
            vatNumber: p.customer.vatNumber,
            fiscalCode: p.customer.fiscalCode,
            address: p.customer.address ?? '',
            postalCode: p.customer.postalCode ?? '',
            city: p.customer.city ?? '',
            province: p.customer.province ?? '',
            country: p.customer.country ?? 'IT',
            recipientCode: p.recipientCode ?? inv.customer.recipientCode,
            pec: p.recipientPec ?? (inv.customer.recipientPec ?? undefined),
          },
          lines,
          taxableAmount,
          inpsSurcharge,
          inpsRatePct,
          professionalFund: otherFund ? { type: otherFund.type, ratePct: otherFund.ratePct, amount: otherFund.amount } : undefined,
          vatAmount: 0,
          virtualStamp,
          stampAmount,
          total,
          payment,
          notes: p.notes,
        };
      } catch (e) {
        if (e instanceof UnprocessableEntityException) throw e;
        // The cause (e.g. the absolute storage path of a missing file) is logged, not returned.
        this.logger.error('Il file XML della fattura non è leggibile', e as Error);
        throw new UnprocessableEntityException('Il file XML della fattura non è leggibile');
      }
    }

    // Draft invoice from DB
    const { profile } = await this.tenants.getWithProfile(tenantId);
    const rules = await this.rules.getActive(inv.year);
    const payment = await this.paymentFromTerms(tenantId, inv);

    const supplierName = profile.businessName || `${profile.firstName} ${profile.lastName}`.trim();
    const customerName = inv.customer.businessName || `${inv.customer.firstName ?? ''} ${inv.customer.lastName ?? ''}`.trim();

    const inpsSurcharge = Number(inv.inpsSurcharge);
    const inpsRatePct = inpsSurcharge > 0 ? rules.inps.surchargePct : undefined;
    const vatNature = inv.vatNature === 'N2_1' ? 'N2.1' : 'N2.2';

    return {
      id: inv.id,
      documentType: inv.type,
      number: inv.number || '',
      date: inv.date.toISOString().slice(0, 10),
      currency: inv.currency,
      isDraft: inv.status === 'DRAFT' || !inv.number,
      status: inv.status,
      supplier: {
        name: supplierName,
        taxRegime: rules.eInvoice.taxRegime,
        vatNumber: profile.vatNumber,
        fiscalCode: profile.fiscalCode,
        address: profile.address,
        postalCode: profile.postalCode,
        city: profile.city,
        province: profile.province,
        country: profile.country,
        pec: profile.pecAddress ?? undefined,
      },
      customer: {
        name: customerName,
        vatNumber: inv.customer.vatNumber ?? undefined,
        fiscalCode: inv.customer.fiscalCode ?? undefined,
        address: inv.customer.address,
        postalCode: inv.customer.postalCode ?? undefined,
        city: inv.customer.city,
        province: inv.customer.province ?? undefined,
        country: inv.customer.country,
        recipientCode: inv.customer.recipientCode,
        pec: inv.customer.recipientPec ?? undefined,
      },
      lines: inv.lines.map((l) => ({
        lineNumber: l.lineNumber,
        description: l.description,
        quantity: Number(l.quantity),
        unit: l.unit ?? undefined,
        unitPrice: Number(l.unitPrice),
        totalPrice: Number(l.totalPrice),
        vatRatePct: 0,
        vatNature,
      })),
      taxableAmount: Number(inv.taxableAmount),
      inpsSurcharge,
      inpsRatePct,
      professionalFund: Number(inv.professionalFundContribution) > 0 && inv.professionalFundType
        ? { type: inv.professionalFundType, ratePct: Number(inv.professionalFundRatePct), amount: Number(inv.professionalFundContribution) }
        : undefined,
      vatAmount: 0,
      virtualStamp: inv.virtualStamp,
      stampAmount: Number(inv.stampAmount),
      total: Number(inv.total),
      payment,
      notes: inv.notes,
    };
  }

  /** Generates a readable PDF courtesy copy of the invoice using pdf-lib. */
  async pdf(tenantId: string, id: string): Promise<{ fileName: string; content: Uint8Array }> {
    const data = await this.preview(tenantId, id);
    const content = await this.pdfService.generate(data);
    const cleanNumber = data.number ? data.number.replace(/[\/\\]/g, '_') : `bozza_${id.slice(-6)}`;
    const fileName = `Fattura_${cleanNumber}.pdf`;
    return { fileName, content };
  }

  private toFatturaPa(
    inv: InvoiceWithRelations,
    profile: Omit<TenantProfile, 'pecPasswordEnc' | 'ibanEnc'>,
    rules: FiscalRuleSet,
    transmissionSeq: number,
    refInvoice: Invoice | null,
    payment?: CourtesyInvoicePayment,
  ): FlatRateInvoice {
    const c = inv.customer;
    const treatment = customerTreatment(rules, c.kind, c.art7SeptiesServices);
    const foreign = treatment.foreign;
    const vatNature = inv.vatNature === 'N2_1' ? 'N2.1' : 'N2.2';
    const isPa = c.kind === 'IT_PA';
    const total = Number(inv.total);
    const taxableAmount = Number(inv.taxableAmount);
    const inpsSurcharge = Number(inv.inpsSurcharge);
    const fundContribution = Number(inv.professionalFundContribution);

    return {
      format: isPa ? 'FPA12' : 'FPR12',
      transmissionId: String(transmissionSeq).padStart(5, '0'),
      recipientCode: c.recipientCode,
      recipientPec: c.recipientCode === '0000000' ? (c.recipientPec ?? undefined) : undefined,
      supplier: {
        countryCode: profile.country,
        vatNumber: profile.vatNumber,
        fiscalCode: profile.fiscalCode,
        businessName: profile.businessName ?? undefined,
        firstName: profile.businessName ? undefined : profile.firstName,
        lastName: profile.businessName ? undefined : profile.lastName,
        taxRegime: rules.eInvoice.taxRegime as 'RF19',
        address: { street: profile.address, postalCode: profile.postalCode, city: profile.city, province: profile.province, country: profile.country },
      },
      customer: {
        countryCode: c.countryCode,
        vatNumber: c.vatNumber ?? undefined,
        fiscalCode: c.fiscalCode ?? undefined,
        businessName: c.businessName ?? undefined,
        firstName: c.businessName ? undefined : (c.firstName ?? undefined),
        lastName: c.businessName ? undefined : (c.lastName ?? undefined),
        address: {
          street: c.address,
          postalCode: c.postalCode ?? (foreign ? '00000' : ''),
          city: c.city,
          province: foreign ? undefined : (c.province ?? undefined),
          country: c.country,
        },
      },
      documentType: inv.type,
      number: inv.number,
      date: inv.date.toISOString().slice(0, 10),
      currency: inv.currency,
      vatNature,
      // Follows the nature stored on the document; the customer's treatment only picks 7-ter or 7-septies.
      legalReference: inv.vatNature !== 'N2_1' ? 'Art. 1, commi 54-89, L. 190/2014' : treatment.nature === 'N2.1' ? treatment.legalReference : 'Art. 7-ter DPR 633/72',
      notes: inv.notes,
      // AdE compilation guide v1.10 (code N2.1): art. 21 par. 6-bis lett. a) operations carry "INVCONT" in AltriDatiGestionali.
      lineManagementData: treatment.reverseChargeLines ? [{ type: 'INVCONT' }] : undefined,
      lines: inv.lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unit: l.unit ?? undefined,
        unitPrice: Number(l.unitPrice),
        totalPrice: Number(l.totalPrice),
      })),
      // One DatiCassaPrevidenziale block: the INPS surcharge (Gestione Separata) or the professional fund contribution,
      // never both (the surcharge is refused for the PROFESSIONAL_FUND scheme, see prepare).
      socialSecurityFund: inpsSurcharge > 0
        ? { type: rules.eInvoice.inpsFundType, ratePct: rules.inps.surchargePct, taxable: taxableAmount, amount: inpsSurcharge }
        : fundContribution > 0 && inv.professionalFundType
          ? { type: inv.professionalFundType, ratePct: Number(inv.professionalFundRatePct), taxable: taxableAmount, amount: fundContribution }
          : undefined,
      stampDuty: inv.virtualStamp ? { amount: Number(inv.stampAmount) } : undefined,
      payment: payment
        ? {
            // TP01 "pagamento a rate" with several installments, TP02 "pagamento completo" with one (Spec. 1.9.1 §2.1.10).
            terms: payment.installments.length > 1 ? 'TP01' : 'TP02',
            method: payment.method ?? 'MP05',
            installments: payment.installments.length > 0 ? payment.installments : [{ amount: total }],
            iban: payment.iban,
            bic: payment.bic,
          }
        : undefined,
      relatedDocuments: refInvoice ? [{ number: refInvoice.number, date: refInvoice.date.toISOString().slice(0, 10) }] : undefined,
    };
  }
}

/**
 * The professional fund contribution charged on invoices ("Dati cassa previdenziale", which "il professionista forfettario
 * deve inserire", AdE guide "La fattura elettronica", December 2025): only for the PROFESSIONAL_FUND scheme, with the
 * fund and rate entered in the profile.
 */
function professionalFundOf(profile: Pick<TenantProfile, 'socialSecurityScheme' | 'professionalFundType' | 'professionalFundRatePct'>) {
  if (profile.socialSecurityScheme !== 'PROFESSIONAL_FUND' || !profile.professionalFundType || profile.professionalFundRatePct === null) return undefined;
  return { type: profile.professionalFundType, ratePct: Number(profile.professionalFundRatePct) };
}
