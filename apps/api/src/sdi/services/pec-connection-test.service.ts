import { HttpException, Injectable } from '@nestjs/common';
import type { PecConnection } from '../types/pec-connection.js';
import type { PecTestEvent } from '../types/pec-test-event.js';
import { pecErrorMessage, pecErrorStep } from './pec-errors.js';
import { PecImapService } from './pec-imap.service.js';
import { PecSettingsService } from './pec-settings.service.js';
import { PecSmtpService } from './pec-smtp.service.js';

/**
 * Test of the saved PEC mailbox, step by step for the settings page: SMTP connection, SMTP login, IMAP connection,
 * IMAP login. Nothing is sent and nothing is stored. Incomplete settings end the test with their message instead of
 * an HTTP error, since the page is already reading the stream.
 */
@Injectable()
export class PecConnectionTestService {
  constructor(
    private readonly settings: PecSettingsService,
    private readonly smtp: PecSmtpService,
    private readonly imap: PecImapService,
  ) {}

  async *run(tenantId: string): AsyncGenerator<PecTestEvent> {
    let c: PecConnection;
    try {
      c = await this.settings.connection(tenantId);
    } catch (err) {
      if (!(err instanceof HttpException)) throw err;
      yield { kind: 'done', ok: false, message: err.message };
      return;
    }
    let ok = true;
    for (const steps of [this.testSmtp(c), this.testImap(c)]) {
      for await (const event of steps) {
        if (event.kind === 'step' && event.status === 'FAILED') ok = false;
        yield event;
      }
    }
    yield ok ? { kind: 'done', ok, message: 'La casella PEC è pronta per l\'invio allo SDI.' } : { kind: 'done', ok };
  }

  private async *testSmtp(c: PecConnection): AsyncGenerator<PecTestEvent> {
    yield { kind: 'step', step: 'SMTP_CONNECT', status: 'RUNNING' };
    let session;
    try {
      session = await this.smtp.open(c);
    } catch (err) {
      yield { kind: 'step', step: 'SMTP_CONNECT', status: 'FAILED', message: pecErrorMessage(err, 'SMTP') };
      yield { kind: 'step', step: 'SMTP_LOGIN', status: 'SKIPPED' };
      return;
    }
    try {
      yield { kind: 'step', step: 'SMTP_CONNECT', status: 'OK', message: `Connessione cifrata a ${c.smtpHost}:${c.smtpPort} riuscita.` };
      yield { kind: 'step', step: 'SMTP_LOGIN', status: 'RUNNING' };
      try {
        await session.login();
      } catch (err) {
        yield { kind: 'step', step: 'SMTP_LOGIN', status: 'FAILED', message: pecErrorMessage(err, 'SMTP') };
        return;
      }
      yield { kind: 'step', step: 'SMTP_LOGIN', status: 'OK', message: `Accesso come ${c.username} riuscito.` };
    } finally {
      session.close();
    }
  }

  /** imapflow connects and logs in within one call: both steps come from it, the error tells which one failed. */
  private async *testImap(c: PecConnection): AsyncGenerator<PecTestEvent> {
    yield { kind: 'step', step: 'IMAP_CONNECT', status: 'RUNNING' };
    const connected = { kind: 'step', step: 'IMAP_CONNECT', status: 'OK', message: `Connessione cifrata a ${c.imapHost}:${c.imapPort} riuscita.` } as const;
    try {
      await this.imap.login(c);
    } catch (err) {
      if (pecErrorStep(err) === 'LOGIN') {
        yield connected;
        yield { kind: 'step', step: 'IMAP_LOGIN', status: 'FAILED', message: pecErrorMessage(err, 'IMAP') };
      } else {
        yield { kind: 'step', step: 'IMAP_CONNECT', status: 'FAILED', message: pecErrorMessage(err, 'IMAP') };
        yield { kind: 'step', step: 'IMAP_LOGIN', status: 'SKIPPED' };
      }
      return;
    }
    yield connected;
    yield { kind: 'step', step: 'IMAP_LOGIN', status: 'OK', message: `Accesso come ${c.username} riuscito.` };
  }
}
