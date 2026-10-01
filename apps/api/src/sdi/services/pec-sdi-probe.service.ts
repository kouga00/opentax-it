import { BadGatewayException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { PecProbeStatus } from '../types/pec-probe-status.js';
import { pecErrorMessage } from './pec-errors.js';
import { newPecMessageId } from './pec-message-id.js';
import { PecImapService } from './pec-imap.service.js';
import { readPecMessage } from './pec-message-reader.js';
import { PROVIDER_DELAY_MESSAGE, PROVIDER_FAILURE_MESSAGES } from './provider-receipt-messages.js';
import { PecSettingsService } from './pec-settings.service.js';
import { PecSmtpService } from './pec-smtp.service.js';

/**
 * Test of the channel towards SDI without issuing anything: a PEC without attachment, to which SDI answers with a
 * "messaggio di cortesia" (Spec. FatturaPA 1.9.1 §1.3.1: "a fronte dell'invio di una PEC priva di allegato da parte del
 * soggetto trasmittente, il SdI invia un messaggio di cortesia allo stesso notiziandolo dell'errato invio"). The replies
 * are read from the mailbox on demand, read-only, and are not stored: the receipts sync ignores them.
 */

@Injectable()
export class PecSdiProbeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: PecSettingsService,
    private readonly smtp: PecSmtpService,
    private readonly imap: PecImapService,
  ) {}

  async send(tenantId: string): Promise<PecProbeStatus> {
    const connection = await this.settings.connection(tenantId);
    const { recipient } = await this.settings.get(tenantId);
    await this.prisma.pecMailboxState.upsert({ where: { tenantId }, create: { tenantId }, update: {} });
    const messageId = newPecMessageId(connection.address);
    try {
      await this.smtp.send(connection, {
        messageId,
        to: recipient,
        subject: 'Prova del canale PEC',
        text: 'Messaggio di prova senza allegato, per verificare il canale PEC verso il Sistema di Interscambio (Specifiche tecniche FatturaPA 1.9.1, paragrafo 1.3.1). Non contiene fatture.',
      });
    } catch (err) {
      throw new BadGatewayException(`Invio non riuscito. ${pecErrorMessage(err, 'SMTP')}`);
    }
    const sentAt = new Date();
    await this.prisma.pecMailboxState.update({ where: { tenantId }, data: { probeMessageId: messageId, probeSentAt: sentAt, probeRecipient: recipient } });
    return { sentAt, recipient };
  }

  /** Reads the mailbox from the day of the test and reports the replies found so far. */
  async status(tenantId: string): Promise<PecProbeStatus> {
    const state = await this.prisma.pecMailboxState.findUnique({ where: { tenantId } });
    if (!state?.probeSentAt || !state.probeMessageId) return { sentAt: null, recipient: null };
    const sentAt = state.probeSentAt;
    const status: PecProbeStatus = { sentAt, recipient: state.probeRecipient };
    const connection = await this.settings.connection(tenantId);
    const since = new Date(Date.UTC(sentAt.getUTCFullYear(), sentAt.getUTCMonth(), sentAt.getUTCDate()));
    try {
      await this.imap.readInbox(connection, { since }, async ({ source }) => {
        const m = await readPecMessage(source).catch(() => undefined);
        if (m?.kind === 'provider-receipt' && m.originalMessageId === state.probeMessageId) {
          const at = m.date ? new Date(m.date) : undefined;
          if (m.type === 'accettazione') status.acceptedAt = at;
          else if (m.type === 'avvenuta-consegna') status.deliveredAt = at;
          else {
            // Failures (§6.3.2, §6.5.3) and the notice of a delivery not confirmed in time (§6.3.5).
            const message = PROVIDER_FAILURE_MESSAGES[m.type] ?? (m.type === 'preavviso-errore-consegna' ? PROVIDER_DELAY_MESSAGE : undefined);
            if (message) status.providerError = m.error ? `${message} ${m.error}` : message;
          }
        } else if (m?.kind === 'sdi-message') {
          const receivedAt = m.date ? new Date(m.date) : undefined;
          // Only replies after the test: a minute of slack for clocks that differ.
          if (receivedAt && receivedAt.getTime() >= sentAt.getTime() - 60_000) {
            status.sdiReply = { from: m.sdiAddress, subject: m.subject, receivedAt, text: m.text };
          }
        }
      });
    } catch (err) {
      throw new BadGatewayException(`Lettura della casella non riuscita. ${pecErrorMessage(err, 'IMAP')}`);
    }
    return status;
  }
}
