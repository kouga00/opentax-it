import { randomUUID } from 'node:crypto';
import { BadGatewayException, BadRequestException, ConflictException, Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { SDI_MAX_FILE_BYTES } from '@opentax-it/fatturapa';
import type { SdiNotification, SdiTransmission } from '../../generated/prisma/client.js';
import { InvoiceStatusService } from '../../invoices/services/invoice-status.service.js';
import { InvoicesService } from '../../invoices/services/invoices.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { StorageService } from '../../storage/storage.service.js';
import { pecErrorMessage } from './pec-errors.js';
import { PecSettingsService } from './pec-settings.service.js';
import { PecSmtpService } from './pec-smtp.service.js';

/**
 * Transmission of issued invoices to SDI through the PEC channel (spec 1.9.1 §1.3.1): the XML file is the
 * attachment of a PEC message to sdi01@pec.fatturapa.it the first time, then to the address SDI assigns in its
 * first reply. The provider's acceptance and delivery receipts attest the transmission, not the issue: the SDI
 * receipts (delivery, rejection, non-delivery) arrive later in the mailbox.
 */
@Injectable()
export class SdiTransmissionsService {
  private readonly logger = new Logger(SdiTransmissionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly settings: PecSettingsService,
    private readonly smtp: PecSmtpService,
    private readonly invoices: InvoicesService,
    private readonly invoiceStatus: InvoiceStatusService,
  ) {}

  async list(tenantId: string, invoiceId: string): Promise<Array<SdiTransmission & { notifications: SdiNotification[] }>> {
    await this.invoices.get(tenantId, invoiceId); // 404 for an invoice of another tenant
    return this.prisma.sdiTransmission.findMany({ where: { invoiceId, invoice: { tenantId } }, orderBy: { createdAt: 'desc' }, include: { notifications: { orderBy: { receivedAt: 'desc' } } } });
  }

  async send(tenantId: string, invoiceId: string): Promise<SdiTransmission> {
    const inv = await this.invoices.get(tenantId, invoiceId);
    if (this.invoiceStatus.isImported(inv)) throw new BadRequestException('Fattura importata: è stata inviata allo SDI con un altro strumento.');
    if (inv.status !== 'ISSUED') throw new BadRequestException('Si possono inviare solo le fatture emesse e non ancora inviate.');
    if (!inv.xmlPath || !inv.xmlFileName) throw new UnprocessableEntityException(`Invoice ${invoiceId} is issued but has no XML file stored`);
    // Invoices to the public administration must be signed (fatturapa.gov.it, "Firmare la FatturaPA"): not supported yet.
    if (inv.customer.kind === 'IT_PA') throw new BadRequestException('Le fatture verso la PA vanno firmate: la firma non è ancora supportata.');

    const connection = await this.settings.connection(tenantId);
    const { sdiPecAssigned, recipient } = await this.settings.get(tenantId);
    // After the first message SDI assigns the address for the next ones; "l'utilizzo di un indirizzo di PEC diverso
    // da quello assegnato dal SdI non garantisce il buon fine della ricezione" (§1.3.1).
    if (!sdiPecAssigned) {
      const sent = await this.prisma.sdiTransmission.count({ where: { invoice: { tenantId }, sentAt: { not: null } } });
      if (sent > 0) {
        throw new BadRequestException('Dopo il primo invio lo SDI comunica con la sua prima ricevuta l\'indirizzo da usare per i successivi: premi "Controlla ricevute" per leggerla, oppure inserisci l\'indirizzo in Impostazioni, sezione PEC.');
      }
    }

    const xml = await this.storage.read(inv.xmlPath);
    if (xml.length > SDI_MAX_FILE_BYTES) throw new UnprocessableEntityException('Il file supera i 5 MB ammessi dallo SDI.');

    // Our own Message-ID, saved before sending: the provider's receipts refer to it (Regole tecniche PEC §6.3), so they
    // can be matched even if the API stops right after the message has left.
    const messageId = `${randomUUID()}@${connection.address.split('@')[1]}`;

    // Claims the invoice first, so that two concurrent requests cannot send it twice.
    const transmission = await this.prisma.$transaction(async (tx) => {
      if (!(await this.invoiceStatus.claimForSending(tx, tenantId, invoiceId))) throw new ConflictException('La fattura è già in invio o è già stata inviata.');
      return tx.sdiTransmission.create({ data: { invoiceId, channel: 'PEC', fileName: inv.xmlFileName!, status: 'PENDING', pecMessageId: messageId } });
    });

    // Only the SMTP call is inside the try: once the message has left, a later error must not reopen the invoice.
    try {
      await this.smtp.send(connection, {
        messageId,
        to: recipient,
        subject: inv.xmlFileName,
        text: `Trasmissione al Sistema di Interscambio del file ${inv.xmlFileName}.`,
        attachment: { fileName: inv.xmlFileName, content: xml },
      });
    } catch (err) {
      const message = pecErrorMessage(err, 'SMTP');
      this.logger.warn(`PEC transmission ${transmission.id} failed: ${(err as { code?: string }).code ?? 'unknown error'}`);
      await this.prisma.$transaction(async (tx) => {
        await tx.sdiTransmission.update({ where: { id: transmission.id }, data: { status: 'ERROR', lastError: message } });
        await this.invoiceStatus.reopen(tx, tenantId, invoiceId);
      });
      throw new BadGatewayException(`Invio non riuscito. ${message}`);
    }
    return this.prisma.sdiTransmission.update({ where: { id: transmission.id }, data: { status: 'SENT', sentAt: new Date() } });
  }
}
