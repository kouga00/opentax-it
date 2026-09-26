import { Injectable } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import SMTPConnection from 'nodemailer/lib/smtp-connection';
import type { PecAttachment } from '../types/pec-attachment.js';
import type { PecConnection } from '../types/pec-connection.js';
import type { SmtpSession } from '../types/smtp-session.js';
import { PEC_TIMEOUTS } from './pec-connection-options.js';

/**
 * SMTP side of the PEC mailbox (nodemailer): sending, and opening a connection without sending for the connection
 * test. Errors are the library's own; turning them into messages for the user is up to the caller (pec-errors.ts).
 * The library logger stays off so that credentials never reach the logs.
 */
@Injectable()
export class PecSmtpService {
  /**
   * Opens the connection (TLS handshake and greeting) and returns a session that can then log in, as two separate
   * steps (SMTPConnection, the class nodemailer's transport uses): connection errors arrive as 'error' events, login
   * errors in the login callback.
   */
  async open(c: PecConnection): Promise<SmtpSession> {
    const connection = new SMTPConnection({ host: c.smtpHost, port: c.smtpPort, secure: true, logger: false, ...PEC_TIMEOUTS });
    let failure: unknown;
    connection.on('error', (err: unknown) => { failure ??= err; });
    try {
      await new Promise<void>((resolve, reject) => {
        connection.once('error', reject);
        connection.connect(() => { connection.removeListener('error', reject); resolve(); });
      });
    } catch (err) {
      connection.close();
      throw err;
    }
    return {
      login: () => new Promise<void>((resolve, reject) => {
        connection.login({ user: c.username, pass: c.password }, (err) => (err ? reject(failure ?? err) : resolve()));
      }),
      close: () => {
        connection.quit();
        connection.close();
      },
    };
  }

  /** Sends one message with one attachment and the given Message-ID. */
  async send(c: PecConnection, message: { messageId: string; to: string; subject: string; text: string; attachment: PecAttachment }): Promise<void> {
    const transport = createTransport({ host: c.smtpHost, port: c.smtpPort, secure: true, auth: { user: c.username, pass: c.password }, logger: false, ...PEC_TIMEOUTS });
    try {
      await transport.sendMail({
        messageId: `<${message.messageId}>`,
        from: c.address,
        to: message.to,
        subject: message.subject,
        text: message.text,
        attachments: [{ filename: message.attachment.fileName, content: message.attachment.content, contentType: 'application/xml' }],
      });
    } finally {
      transport.close();
    }
  }
}
