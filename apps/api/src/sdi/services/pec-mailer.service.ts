import { Injectable } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { createTransport } from 'nodemailer';
import type { ConnectionCheck } from '../types/connection-check.js';
import type { PecConnection } from '../types/pec-connection.js';
import { pecErrorMessage } from './pec-errors.js';

/** Timeouts in milliseconds: long enough for a slow provider, short enough for a request the user is waiting on. */
const TIMEOUTS = { connectionTimeout: 15_000, greetingTimeout: 15_000, socketTimeout: 60_000 };

export interface PecAttachment {
  fileName: string;
  content: Buffer;
}

/**
 * SMTP and IMAP access to the PEC mailbox, with nodemailer and imapflow. Always implicit SSL/TLS (`secure: true`),
 * as every preset provider requires; the libraries' loggers stay off so that credentials never reach the logs.
 */
@Injectable()
export class PecMailerService {
  private transport(c: PecConnection) {
    return createTransport({ host: c.smtpHost, port: c.smtpPort, secure: true, auth: { user: c.username, pass: c.password }, logger: false, ...TIMEOUTS });
  }

  async checkSmtp(c: PecConnection): Promise<ConnectionCheck> {
    const transport = this.transport(c);
    try {
      await transport.verify();
      return { ok: true, message: 'Accesso al server SMTP riuscito.' };
    } catch (err) {
      return { ok: false, message: pecErrorMessage(err, 'SMTP') };
    } finally {
      transport.close();
    }
  }

  async checkImap(c: PecConnection): Promise<ConnectionCheck> {
    const client = new ImapFlow({ host: c.imapHost, port: c.imapPort, secure: true, auth: { user: c.username, pass: c.password }, logger: false, ...TIMEOUTS });
    client.on('error', () => undefined); // connection errors also reject connect(); without a listener they would crash the process
    try {
      await client.connect();
      await client.logout();
      return { ok: true, message: 'Accesso al server IMAP riuscito.' };
    } catch (err) {
      client.close();
      return { ok: false, message: pecErrorMessage(err, 'IMAP') };
    }
  }

  /** Sends one message with one attachment; resolves with the Message-ID, rejects with the library error. */
  async send(c: PecConnection, message: { to: string; subject: string; text: string; attachment: PecAttachment }): Promise<{ messageId: string }> {
    const transport = this.transport(c);
    try {
      const info = await transport.sendMail({
        from: c.address,
        to: message.to,
        subject: message.subject,
        text: message.text,
        attachments: [{ filename: message.attachment.fileName, content: message.attachment.content, contentType: 'application/xml' }],
      });
      return { messageId: info.messageId };
    } finally {
      transport.close();
    }
  }
}
