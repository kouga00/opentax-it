import { BadRequestException, HttpException, Injectable, Logger } from '@nestjs/common';
import { parseSdiReceipt, type SdiReceipt } from '@opentax-it/fatturapa';
import type { ImportContext } from '../../common/import/import-context.js';
import type { ImportHandler } from '../../common/import/import-handler.js';
import type { ImportPreviewRow } from '../../common/import/import-preview-row.js';
import type { ImportResult } from '../../common/import/import-result.js';
import type { XmlEntry } from '../../common/import/xml-entry.js';
import { InvoicesService } from '../../invoices/services/invoices.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { decideReceipt, type ReceiptDecision } from './receipt-import-decision.js';
import { sdiReceiptKey, SdiReceiptsService } from './sdi-receipts.service.js';
import { SDI_OUTCOMES } from './transmission-statuses.js';

/**
 * Import handler (strategy of the imports module) for SDI receipts uploaded by the user: RC, NS and MC downloaded
 * from the AdE portal ("Consultazioni e download massivi" lets you "scaricare [...] le ricevute dei file
 * trasmessi") or saved from a mailbox. It records the outcome of invoices sent with another tool, or of ours when
 * the receipt is missing from the PEC mailbox.
 *
 * The receipt is matched to the invoice through NomeFile, the name of the invoice file, unique per tenant; in the
 * preview, also to an invoice imported by the same upload (ImportContext). Whether it is new, a duplicate or in
 * conflict is decided by decideReceipt, the same way in preview and import. An invoice without transmissions gets
 * one with channel OTHER. The SDI address is not learned here: the upload is not a certified PEC message.
 */

const LABELS: Record<SdiReceipt['type'], string> = {
  RC: 'Ricevuta di consegna',
  NS: 'Ricevuta di scarto',
  MC: 'Impossibilità di recapito',
};

/** Outcome already recorded on a transmission, as the receipt type that gave it. */
const OUTCOME_TYPE: Record<string, SdiReceipt['type']> = { SDI_DELIVERED: 'RC', SDI_NOT_DELIVERED: 'MC', SDI_REJECTED: 'NS' };

const UNEXPECTED = 'Errore imprevisto durante l\'import di questa ricevuta';

/** What an upload has shown so far: receipt keys and the outcome given to each invoice file. */
interface UploadMemory {
  keys: Set<string>;
  outcomes: Map<string, SdiReceipt['type']>;
}

/** A receipt matched to its invoice, stored or imported by the same upload. */
interface Matched {
  receipt: SdiReceipt;
  invoice: { id?: string; number: string };
  decision: ReceiptDecision;
}

@Injectable()
export class SdiReceiptsImportService implements ImportHandler {
  readonly kind = 'SDI_RECEIPT' as const;
  private readonly logger = new Logger(SdiReceiptsImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoices: InvoicesService,
    private readonly receipts: SdiReceiptsService,
  ) {}

  async preview(tenantId: string, entries: XmlEntry[], context?: ImportContext): Promise<ImportPreviewRow[]> {
    const memory = newMemory();
    const rows: ImportPreviewRow[] = [];
    for (const e of entries) {
      try {
        const m = await this.match(tenantId, e, memory, context);
        const { receipt, invoice, decision } = m;
        rows.push({
          file: e.name,
          kind: 'SDI_RECEIPT',
          status: decision.status === 'NEW' ? 'NEW' : decision.status === 'DUPLICATE' ? 'DUPLICATE' : 'ERROR',
          documentType: receipt.type,
          number: invoice.number,
          date: (receipt.deliveredAt ?? receipt.receivedAt).slice(0, 10),
          invoiceId: invoice.id,
          message: this.message(m, !invoice.id),
        });
      } catch (err) {
        rows.push({ file: e.name, kind: 'SDI_RECEIPT', status: 'ERROR', message: this.errorMessage(e.name, err) });
      }
    }
    return rows;
  }

  async importEntries(tenantId: string, entries: XmlEntry[]): Promise<ImportResult[]> {
    const memory = newMemory();
    const results: ImportResult[] = [];
    for (const e of entries) {
      try {
        const m = await this.match(tenantId, e, memory);
        const { receipt, invoice, decision } = m;
        const base = { file: e.name, kind: 'SDI_RECEIPT' as const, number: invoice.number, invoiceId: invoice.id };
        if (decision.status !== 'NEW' || !invoice.id) {
          results.push({ ...base, status: decision.status === 'DUPLICATE' ? 'SKIPPED' : 'ERROR', message: this.message(m, false) });
          continue;
        }
        const transmission = await this.prisma.sdiTransmission.findFirst({ where: { fileName: receipt.fileName, invoice: { tenantId } }, orderBy: { createdAt: 'desc' } })
          ?? await this.prisma.sdiTransmission.create({ data: { invoiceId: invoice.id, channel: 'OTHER', fileName: receipt.fileName, status: 'SENT' } });
        const recorded = await this.receipts.applySdiReceipt(tenantId, transmission, e.fileName, Buffer.from(e.xml), receipt);
        results.push({ ...base, status: recorded ? 'IMPORTED' : 'SKIPPED', message: recorded ? LABELS[receipt.type] : 'Già registrata' });
      } catch (err) {
        results.push({ file: e.name, kind: 'SDI_RECEIPT', status: 'ERROR', message: this.errorMessage(e.name, err) });
      }
    }
    return results;
  }

  /** Reads the receipt, finds its invoice and decides what to do, remembering it for the rest of the upload. */
  private async match(tenantId: string, e: XmlEntry, memory: UploadMemory, context?: ImportContext): Promise<Matched> {
    const receipt = parse(e);
    const key = sdiReceiptKey(receipt);
    const stored = await this.invoices.findByXmlFileName(tenantId, receipt.fileName);
    const upcoming = stored ? undefined : context?.upcomingInvoices.get(receipt.fileName);
    if (!stored && !upcoming) throw new BadRequestException(`Nessuna fattura con il file ${receipt.fileName}: importa prima la fattura`);

    let alreadyRecorded = memory.keys.has(key);
    let knownOutcome = memory.outcomes.get(receipt.fileName);
    if (stored) {
      const [recorded, last] = await Promise.all([
        this.prisma.sdiNotification.findFirst({ where: { dedupeKey: key, transmission: { invoiceId: stored.id, invoice: { tenantId } } }, select: { id: true } }),
        this.prisma.sdiTransmission.findFirst({ where: { fileName: receipt.fileName, invoice: { tenantId } }, orderBy: { createdAt: 'desc' }, select: { status: true } }),
      ]);
      alreadyRecorded ||= Boolean(recorded);
      if (last && SDI_OUTCOMES.includes(last.status)) knownOutcome ??= OUTCOME_TYPE[last.status];
    }
    const decision = decideReceipt({ receipt, alreadyRecorded, knownOutcome });
    memory.keys.add(key);
    if (decision.status === 'NEW') memory.outcomes.set(receipt.fileName, receipt.type);
    return { receipt, invoice: stored ? { id: stored.id, number: stored.number } : { number: upcoming!.number }, decision };
  }

  private message({ receipt, invoice, decision }: Matched, importedTogether: boolean): string {
    if (decision.status === 'DUPLICATE') return 'Già registrata';
    if (decision.status === 'CONFLICT') return `Esito in conflitto: per questo file lo SDI ha già dato ${LABELS[decision.outcome].toLowerCase()}. Ricevuta non registrata`;
    return `${LABELS[receipt.type]} della fattura ${invoice.number}${importedTogether ? ', importata insieme' : ''}`;
  }

  /** Only our own messages reach the client; anything else (database, file system) is logged. */
  private errorMessage(file: string, err: unknown): string {
    if (err instanceof HttpException) return err.message;
    this.logger.error(`Import of receipt ${file} failed`, err as Error);
    return UNEXPECTED;
  }
}

const newMemory = (): UploadMemory => ({ keys: new Set(), outcomes: new Map() });

function parse(e: XmlEntry): SdiReceipt {
  let receipt: SdiReceipt | undefined;
  try {
    receipt = parseSdiReceipt(e.xml);
  } catch {
    throw new BadRequestException('Ricevuta SDI incompleta o non leggibile');
  }
  if (!receipt) throw new BadRequestException('Messaggio SDI non gestito: si importano ricevute di consegna, di scarto e di impossibilità di recapito');
  return receipt;
}
