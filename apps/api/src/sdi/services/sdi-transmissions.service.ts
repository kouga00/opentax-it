import { BadGatewayException, BadRequestException, ConflictException, Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { SDI_MAX_FILE_BYTES } from '@opentax-it/fatturapa';
import type { SdiTransmission } from '../../generated/prisma/client.js';
import { isImportedXmlPath } from '../../invoices/services/invoices-import.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { StorageService } from '../../storage/storage.service.js';
import { pecErrorMessage } from './pec-errors.js';
import { PecMailerService } from './pec-mailer.service.js';
import { PecSettingsService } from './pec-settings.service.js';

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
    private readonly mailer: PecMailerService,
  ) {}

  async list(tenantId: string, invoiceId: string): Promise<SdiTransmission[]> {
    const inv = await this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId }, select: { id: true } });
    if (!inv) throw new NotFoundException(`Invoice ${invoiceId} not found`);
    return this.prisma.sdiTransmission.findMany({ where: { invoiceId, invoice: { tenantId } }, orderBy: { createdAt: 'desc' } });
  }

  async send(tenantId: string, invoiceId: string): Promise<SdiTransmission> {
    const inv = await this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId }, include: { customer: { select: { kind: true } } } });
    if (!inv) throw new NotFoundException(`Invoice ${invoiceId} not found`);
    if (isImportedXmlPath(inv.xmlPath)) throw new BadRequestException('Fattura importata: è stata inviata allo SDI con un altro strumento.');
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
        throw new BadRequestException('Dopo il primo invio lo SDI comunica, nella sua risposta via PEC, l\'indirizzo da usare per i successivi: inseriscilo in Impostazioni, sezione PEC.');
      }
    }

    const xml = await this.storage.read(inv.xmlPath);
    if (xml.length > SDI_MAX_FILE_BYTES) throw new UnprocessableEntityException('Il file supera i 5 MB ammessi dallo SDI.');

    // Claims the invoice first, so that two concurrent requests cannot send it twice.
    const transmission = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.invoice.updateMany({ where: { id: invoiceId, tenantId, status: 'ISSUED' }, data: { status: 'SENT' } });
      if (claimed.count === 0) throw new ConflictException('La fattura è già in invio o è già stata inviata.');
      return tx.sdiTransmission.create({ data: { invoiceId, channel: 'PEC', fileName: inv.xmlFileName!, status: 'PENDING' } });
    });

    // Only the SMTP call is inside the try: once the message has left, a later error must not reopen the invoice.
    let messageId: string;
    try {
      ({ messageId } = await this.mailer.send(connection, {
        to: recipient,
        subject: inv.xmlFileName,
        text: `Trasmissione al Sistema di Interscambio del file ${inv.xmlFileName}.`,
        attachment: { fileName: inv.xmlFileName, content: xml },
      }));
    } catch (err) {
      const message = pecErrorMessage(err, 'SMTP');
      this.logger.warn(`PEC transmission ${transmission.id} failed: ${(err as { code?: string }).code ?? 'unknown error'}`);
      await this.prisma.$transaction([
        this.prisma.sdiTransmission.update({ where: { id: transmission.id }, data: { status: 'ERROR', lastError: message } }),
        this.prisma.invoice.updateMany({ where: { id: invoiceId, tenantId, status: 'SENT' }, data: { status: 'ISSUED' } }),
      ]);
      throw new BadGatewayException(`Invio non riuscito. ${message}`);
    }
    return this.prisma.sdiTransmission.update({ where: { id: transmission.id }, data: { status: 'SENT', sentAt: new Date(), pecMessageId: messageId } });
  }
}
