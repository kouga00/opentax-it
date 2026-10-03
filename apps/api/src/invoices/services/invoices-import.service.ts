import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { INPS_SOCIAL_SECURITY_FUND, parseInvoiceXml, type ParsedInvoice, type ParsedParty, SOCIAL_SECURITY_FUNDS } from '@opentax-it/fatturapa';
import { isEuMemberState } from '@opentax-it/fiscal-rules';
import type { TenantProfile } from '../../generated/prisma/client.js';
import type { CustomerKind, DocumentType, VatNature } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { StorageService } from '../../storage/storage.service.js';
import { TenantsService } from '../../tenants/tenants.service.js';
import type { ImportContext } from '../../common/import/import-context.js';
import { importErrorMessage } from '../../common/import/import-error-message.js';
import { FUTURE_INVOICE_DATE, todayInItaly } from '../../common/italian-date.js';
import type { ImportHandler } from '../../common/import/import-handler.js';
import type { ImportPreviewRow } from '../../common/import/import-preview-row.js';
import type { ImportResult } from '../../common/import/import-result.js';
import type { XmlEntry } from '../../common/import/xml-entry.js';

/**
 * Import handler (strategy of the imports module) for invoices issued with other software, from their FatturaPA
 * XML files, so that the year's numbering, stamp duty and collections are complete. Imported documents are stored
 * as ISSUED and imported, with the original number and the original XML file.
 *
 * Two steps on the same files, with nothing kept on the server in between: preview() analyses them
 * without writing, importEntries() writes the selected ones after analysing them again.
 *
 * Checks: the CedentePrestatore must be the tenant (same VAT number); a document with the
 * same year, type and number is skipped; only TD01/TD04/TD05/TD06 are accepted.
 */

/** A document that passed the checks, with what is needed to store it. */
interface AnalyzedInvoice {
  parsed: ParsedInvoice;
  year: number;
  type: DocumentType;
  sequence: number;
  existingId?: string;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const ACCEPTED: DocumentType[] = ['TD01', 'TD04', 'TD05', 'TD06'];
const UNEXPECTED = 'Errore imprevisto durante l\'import di questo file';

/** Name the imported file is stored under and matched by (SDI receipts refer to it as NomeFile). */
const storedFileName = (e: XmlEntry) => e.fileName.replace(/[^A-Za-z0-9._-]/g, '_');

/** Imported XML files are stored apart from the ones generated here. */
const IMPORTED_FOLDER = 'imported';

@Injectable()
export class InvoicesImportService implements ImportHandler {
  readonly kind = 'INVOICE' as const;

  private readonly logger = new Logger(InvoicesImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
    private readonly storage: StorageService,
  ) {}

  /** What importing these invoices would do, without writing anything. */
  async preview(tenantId: string, entries: XmlEntry[], context?: ImportContext): Promise<ImportPreviewRow[]> {
    const { profile } = await this.tenants.getWithProfile(tenantId);
    const rows: ImportPreviewRow[] = [];
    // Documents met earlier in the same upload, which the import would find already stored.
    const numbers = new Set<string>();
    const sequences = new Map<string, string>();
    const fileNames = new Set<string>();
    for (const e of entries) {
      let p: ParsedInvoice;
      try {
        p = parse(e.xml);
      } catch (err) {
        rows.push({ file: e.name, kind: 'INVOICE', status: 'ERROR', message: this.errorMessage(e.name, err) });
        continue;
      }
      // The document data is shown even when a check fails, so that the user can tell which one it is.
      const row: ImportPreviewRow = {
        file: e.name,
        kind: 'INVOICE',
        status: 'NEW',
        documentType: p.documentType,
        number: p.number.slice(0, 40),
        date: p.date,
        customer: partyName(p.customer),
        total: deriveAmounts(p).total,
      };
      rows.push(row);
      try {
        const a = await this.check(tenantId, profile, p, storedFileName(e));
        const numberKey = `${a.year}|${a.type}|${p.number}`;
        const sequenceKey = `${a.year}|${a.type}|${a.sequence}`;
        if (a.existingId) Object.assign(row, { status: 'DUPLICATE', invoiceId: a.existingId, message: 'Già presente' });
        else if (numbers.has(numberKey)) Object.assign(row, { status: 'DUPLICATE', message: 'Compare più volte nei file caricati' });
        else if (sequences.has(sequenceKey)) Object.assign(row, { status: 'ERROR', message: `Progressivo ${a.sequence}/${a.year} già usato dal documento ${sequences.get(sequenceKey)} nei file caricati` });
        else if (fileNames.has(storedFileName(e))) Object.assign(row, { status: 'ERROR', message: `Il nome file ${storedFileName(e)} compare più volte nei file caricati` });
        numbers.add(numberKey);
        if (!sequences.has(sequenceKey)) sequences.set(sequenceKey, p.number);
        if (row.status === 'NEW') {
          fileNames.add(storedFileName(e));
          context?.upcomingInvoices.set(storedFileName(e), { number: p.number, entry: e.name });
        }
      } catch (err) {
        Object.assign(row, { status: 'ERROR', message: this.errorMessage(e.name, err) });
      }
    }
    return rows;
  }

  async importEntries(tenantId: string, entries: XmlEntry[]): Promise<ImportResult[]> {
    const { profile } = await this.tenants.getWithProfile(tenantId);
    const results: ImportResult[] = [];
    for (const e of entries) {
      try {
        results.push({ ...(await this.importOne(tenantId, profile, e)), kind: 'INVOICE' });
      } catch (err) {
        results.push({ file: e.name, kind: 'INVOICE', status: 'ERROR', message: this.errorMessage(e.name, err) });
      }
    }
    return results;
  }

  private errorMessage(file: string, e: unknown): string {
    return importErrorMessage(this.logger, file, e, UNEXPECTED);
  }

  /** Checks a parsed document against the tenant and the invoices already stored. */
  private async check(tenantId: string, profile: ImportProfile, p: ParsedInvoice, fileName: string): Promise<AnalyzedInvoice> {
    if (p.supplier.vatNumber !== profile.vatNumber) {
      throw new BadRequestException(`Il cedente ${p.supplier.countryCode ?? ''}${p.supplier.vatNumber ?? ''} non è la partita IVA attiva (${profile.vatNumber})`);
    }
    if (!ACCEPTED.includes(p.documentType as DocumentType)) throw new BadRequestException(`Tipo documento ${p.documentType} non importabile (solo TD01, TD04, TD05, TD06)`);
    // Numero: String20Type of the FatturaPA XSD (Basic Latin, 1-20 characters).
    if (!/^[\x20-\x7E]{1,20}$/.test(p.number)) throw new BadRequestException(`Numero documento non valido "${p.number.slice(0, 40)}"`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) throw new BadRequestException(`Data documento non valida "${p.date}"`);
    // An invoice that went through SDI cannot be dated after its receipt: such a file was never issued.
    if (p.date > todayInItaly()) throw new BadRequestException(FUTURE_INVOICE_DATE);
    // A professional fund contribution (TC01-TC21) is not the INPS surcharge and, for those enrolled in a fund, not
    // revenue (AdE, precompilata "Quadro LM"): it is imported only with the PROFESSIONAL_FUND scheme, one block at most.
    const funds = p.socialSecurityFunds.filter((f) => f.type !== INPS_SOCIAL_SECURITY_FUND);
    const fund = funds[0];
    if (fund && profile.socialSecurityScheme !== 'PROFESSIONAL_FUND') {
      throw new BadRequestException(`Contributo della cassa previdenziale ${fund.type} (${SOCIAL_SECURITY_FUNDS[fund.type] ?? 'codice sconosciuto'}): per importarla scegli "Cassa professionale" come gestione previdenziale nel profilo`);
    }
    if (funds.length > 1) throw new BadRequestException('Più contributi di cassa professionale nella stessa fattura: non ancora supportati');
    const year = Number(p.date.slice(0, 4));
    const type = p.documentType as DocumentType;

    const existing = await this.prisma.invoice.findFirst({ where: { tenantId, year, type, number: p.number } });
    const sequence = parseSequence(p.number, year);
    if (existing) return { parsed: p, year, type, sequence: sequence ?? existing.sequence ?? 0, existingId: existing.id };
    if (sequence === undefined) throw new BadRequestException(`Impossibile ricavare un progressivo dal numero "${p.number}"`);
    const clash = await this.prisma.invoice.findFirst({ where: { tenantId, year, type, sequence } });
    if (clash) throw new BadRequestException(`Progressivo ${sequence}/${year} già usato dal documento ${clash.number}`);
    // SDI rejects a file name already used (Spec. 1.9.1 §1.2.2, error 00002), and receipts are matched by it.
    const sameName = await this.prisma.invoice.findUnique({ where: { tenantId_xmlFileName: { tenantId, xmlFileName: fileName } }, select: { number: true } });
    if (sameName) throw new BadRequestException(`Il nome file ${fileName} è già usato dal documento ${sameName.number}`);
    return { parsed: p, year, type, sequence };
  }

  private async importOne(tenantId: string, profile: ImportProfile, f: XmlEntry): Promise<ImportResult> {
    const xmlFileName = storedFileName(f);
    const { parsed: p, year, type, sequence, existingId } = await this.check(tenantId, profile, parse(f.xml), xmlFileName);
    if (existingId) return { file: f.name, status: 'SKIPPED', number: p.number, invoiceId: existingId, message: 'Già presente' };

    // A foreign customer invoiced with N2.2 (made in Italy) is a private customer (art. 7-ter par. 1 lett. b).
    const privateForeign = [...p.summaryNatures, ...p.lines.map((l) => l.nature)].includes('N2.2');
    const customer = await this.findOrCreateCustomer(tenantId, p.customer, p.recipientCode, p.recipientPec, privateForeign);
    const amounts = deriveAmounts(p);
    const refInvoice = p.relatedDocuments[0]
      ? await this.prisma.invoice.findFirst({ where: { tenantId, number: p.relatedDocuments[0].number, type: 'TD01' } })
      : null;


    // The stored XML is the archived copy of the document: its path carries the invoice id so that
    // two imports with the same file name never share a file, and it is never overwritten. The
    // file is written inside the transaction, so a failed write leaves no invoice without its XML.
    const inv = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          tenantId,
          customerId: customer.id,
          type,
          year,
          sequence,
          number: p.number,
          date: new Date(`${p.date}T00:00:00Z`),
          currency: p.currency,
          exchangeRate: 1,
          vatNature: amounts.vatNature,
          taxableAmount: amounts.taxableAmount,
          inpsSurcharge: amounts.inpsSurcharge,
          professionalFundType: amounts.professionalFund?.type ?? null,
          professionalFundRatePct: amounts.professionalFund?.ratePct ?? null,
          professionalFundContribution: amounts.professionalFund?.amount ?? 0,
          virtualStamp: amounts.virtualStamp,
          stampAmount: amounts.stampAmount,
          total: amounts.total,
          notes: p.notes,
          status: 'ISSUED',
          imported: true,
          refInvoiceId: refInvoice?.id ?? null,
          paymentMethod: p.payments[0]?.method ?? null,
          xmlFileName,
          internalNotes: `Importata da ${f.name}`,
          lines: {
            create: p.lines.map((l) => ({
              lineNumber: l.lineNumber,
              description: l.description,
              quantity: l.quantity ?? 1,
              unit: l.unit ?? null,
              unitPrice: l.unitPrice,
              totalPrice: l.totalPrice,
            })),
          },
        },
      });
      const xmlPath = await this.storage.write(`${tenantId}/invoices/${year}/${IMPORTED_FOLDER}/${created.id}_${xmlFileName}`, f.xml, { exclusive: true });
      return tx.invoice.update({ where: { id: created.id }, data: { xmlPath } });
    });
    return { file: f.name, status: 'IMPORTED', number: p.number, invoiceId: inv.id, customer: partyName(customer) };
  }

  private async findOrCreateCustomer(tenantId: string, c: ParsedParty, recipientCode?: string, recipientPec?: string, privateForeign = false) {
    const countryCode = c.countryCode ?? (c.country ?? 'IT');
    const foreign = countryCode !== 'IT';
    const found = await this.prisma.customer.findFirst({
      where: {
        tenantId,
        OR: [
          ...(c.vatNumber ? [{ countryCode, vatNumber: c.vatNumber }] : []),
          ...(c.fiscalCode ? [{ fiscalCode: c.fiscalCode }] : []),
        ],
      },
    });
    if (found) return found;
    const kind: CustomerKind = foreign
      ? isEuMemberState(countryCode) ? (privateForeign ? 'EU_B2C' : 'EU') : privateForeign ? 'NON_EU_B2C' : 'NON_EU'
      : recipientCode && /^[A-Z0-9]{6}$/.test(recipientCode) ? 'IT_PA' : c.vatNumber ? 'IT_B2B' : 'IT_B2C';
    return this.prisma.customer.create({
      data: {
        tenantId,
        kind,
        businessName: c.businessName ?? null,
        firstName: c.firstName ?? null,
        lastName: c.lastName ?? null,
        vatNumber: c.vatNumber ?? null,
        fiscalCode: c.fiscalCode ?? null,
        countryCode,
        address: c.address ?? '',
        postalCode: c.postalCode ?? (foreign ? '00000' : null),
        city: c.city ?? '',
        province: foreign ? null : (c.province ?? null),
        country: c.country ?? countryCode,
        recipientCode: recipientCode ?? (foreign ? 'XXXXXXX' : '0000000'),
        recipientPec: recipientPec ?? null,
        notes: 'Creato dall\'import di una fattura XML',
      },
    });
  }
}

/** Parses the XML; a malformed or unsupported file is a validation error shown to the user, without the parser's words. */
function parse(xml: string): ParsedInvoice {
  try {
    return parseInvoiceXml(xml);
  } catch {
    throw new BadRequestException('XML FatturaPA non valido o non supportato (ad esempio un lotto con più fatture)');
  }
}

function partyName(c: { businessName?: string | null; firstName?: string | null; lastName?: string | null }): string {
  return c.businessName ?? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
}

/**
 * Progressive of a document number of the given year: "12/2026", "2026-12", "2026/FE/0012", "FPA 12", "12" → 12.
 * The year of the document is dropped wherever it appears, then the last group of digits is the progressive.
 * Undefined when no digits are found.
 */
export function parseSequence(number: string, year: number): number | undefined {
  const groups = number.match(/\d+/g) ?? [];
  const withoutYear = groups.filter((g) => g !== String(year));
  const last = (withoutYear.length > 0 ? withoutYear : groups).at(-1);
  return last === undefined ? undefined : Number(last);
}

/** Profile data the import checks: the supplier must be the active VAT number, and its scheme decides fund contributions. */
type ImportProfile = Pick<TenantProfile, 'vatNumber' | 'socialSecurityScheme'>;

function deriveAmounts(p: ParsedInvoice) {
  const virtualStamp = p.stampDuty?.virtual === true;
  const stampAmount = virtualStamp ? round2(p.stampDuty?.amount ?? 2) : 0;
  // Some software exposes the recharged stamp duty as an invoice line (N2.2) besides DatiBollo.
  // Such a line is kept as imported but excluded from taxableAmount, so that taxable + stamp = total
  // as in documents issued here. The recharged stamp is revenue either way (AdE ruling 428/2022);
  // revenue is measured on collections.
  const isStampLine = (l: ParsedInvoice['lines'][number]) => virtualStamp && /bollo/i.test(l.description) && round2(l.totalPrice) === stampAmount;
  const taxableAmount = round2(p.lines.filter((l) => !isStampLine(l)).reduce((s, l) => s + l.totalPrice, 0));
  const inpsSurcharge = round2(p.socialSecurityFunds.filter((f) => f.type === INPS_SOCIAL_SECURITY_FUND).reduce((s, f) => s + f.amount, 0));
  const fund = p.socialSecurityFunds.find((f) => f.type !== INPS_SOCIAL_SECURITY_FUND); // one at most, see check()
  const professionalFund = fund ? { type: fund.type, ratePct: fund.ratePct, amount: round2(fund.amount) } : undefined;
  const total = p.documentTotal !== undefined ? round2(p.documentTotal) : round2(taxableAmount + inpsSurcharge + (professionalFund?.amount ?? 0) + stampAmount);
  const natures = new Set([...p.summaryNatures, ...p.lines.map((l) => l.nature).filter(Boolean)]);
  const vatNature: VatNature = natures.has('N2.1') ? 'N2_1' : 'N2_2';
  return { taxableAmount, inpsSurcharge, professionalFund, virtualStamp, stampAmount, total, vatNature };
}
