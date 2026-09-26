import { Injectable } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { createTransport } from 'nodemailer';
import SMTPConnection from 'nodemailer/lib/smtp-connection';
import type { ConnectionCheck } from '../types/connection-check.js';
import type { PecConnection } from '../types/pec-connection.js';
import type { PecTestEvent } from '../types/pec-test-event.js';
import { pecErrorMessage, pecErrorStep } from './pec-errors.js';

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

  /**
   * Opens the SMTP connection and logs in as two separate steps (nodemailer SMTPConnection, the class its transport
   * uses): connection errors arrive as 'error' events, login errors in the login callback. Nothing is sent.
   */
  async *testSmtp(c: PecConnection): AsyncGenerator<PecTestEvent> {
    const connection = new SMTPConnection({ host: c.smtpHost, port: c.smtpPort, secure: true, logger: false, ...TIMEOUTS });
    let failed: unknown;
    connection.on('error', (err: unknown) => { failed ??= err; });
    try {
      yield { kind: 'step', step: 'SMTP_CONNECT', status: 'RUNNING' };
      try {
        await new Promise<void>((resolve, reject) => {
          connection.once('error', reject);
          connection.connect(() => { connection.removeListener('error', reject); resolve(); });
        });
      } catch (err) {
        yield { kind: 'step', step: 'SMTP_CONNECT', status: 'FAILED', message: pecErrorMessage(err, 'SMTP') };
        yield { kind: 'step', step: 'SMTP_LOGIN', status: 'SKIPPED' };
        return;
      }
      yield { kind: 'step', step: 'SMTP_CONNECT', status: 'OK', message: `Connessione cifrata a ${c.smtpHost}:${c.smtpPort} riuscita.` };
      yield { kind: 'step', step: 'SMTP_LOGIN', status: 'RUNNING' };
      try {
        await new Promise<void>((resolve, reject) => {
          connection.login({ user: c.username, pass: c.password }, (err) => (err ? reject(err) : resolve()));
        });
      } catch (err) {
        yield { kind: 'step', step: 'SMTP_LOGIN', status: 'FAILED', message: pecErrorMessage(failed ?? err, 'SMTP') };
        return;
      }
      yield { kind: 'step', step: 'SMTP_LOGIN', status: 'OK', message: `Accesso come ${c.username} riuscito.` };
      connection.quit();
    } finally {
      connection.close();
    }
  }

  /**
   * IMAP connection and login: imapflow opens the connection and logs in within connect(), with no public way to
   * stop in between, so both steps come from that call; which one failed is told by the error (pecErrorStep).
   */
  async *testImap(c: PecConnection): AsyncGenerator<PecTestEvent> {
    yield { kind: 'step', step: 'IMAP_CONNECT', status: 'RUNNING' };
    const r = await this.checkImap(c);
    if (r.ok) {
      yield { kind: 'step', step: 'IMAP_CONNECT', status: 'OK', message: `Connessione cifrata a ${c.imapHost}:${c.imapPort} riuscita.` };
      yield { kind: 'step', step: 'IMAP_LOGIN', status: 'OK', message: `Accesso come ${c.username} riuscito.` };
      return;
    }
    if (r.failedStep === 'LOGIN') {
      yield { kind: 'step', step: 'IMAP_CONNECT', status: 'OK', message: `Connessione cifrata a ${c.imapHost}:${c.imapPort} riuscita.` };
      yield { kind: 'step', step: 'IMAP_LOGIN', status: 'FAILED', message: r.message };
      return;
    }
    yield { kind: 'step', step: 'IMAP_CONNECT', status: 'FAILED', message: r.message };
    yield { kind: 'step', step: 'IMAP_LOGIN', status: 'SKIPPED' };
  }

  private async checkImap(c: PecConnection): Promise<ConnectionCheck> {
    const client = new ImapFlow({ host: c.imapHost, port: c.imapPort, secure: true, auth: { user: c.username, pass: c.password }, logger: false, ...TIMEOUTS });
    client.on('error', () => undefined); // connection errors also reject connect(); without a listener they would crash the process
    try {
      await client.connect();
      await client.logout();
      return { ok: true, message: 'Accesso al server IMAP riuscito.' };
    } catch (err) {
      client.close();
      return { ok: false, message: pecErrorMessage(err, 'IMAP'), failedStep: pecErrorStep(err) };
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
