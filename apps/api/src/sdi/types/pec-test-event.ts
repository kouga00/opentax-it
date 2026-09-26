/** Steps of the PEC mailbox test, in order. IMAP connection and login happen in one imapflow call (see PecMailerService). */
export type PecTestStep = 'SMTP_CONNECT' | 'SMTP_LOGIN' | 'IMAP_CONNECT' | 'IMAP_LOGIN';

export type PecTestStepStatus = 'RUNNING' | 'OK' | 'FAILED' | 'SKIPPED';

/** One update of the test, streamed to the page: a step changing status, or the end with the overall result. */
export type PecTestEvent =
  | { kind: 'step'; step: PecTestStep; status: PecTestStepStatus; message?: string }
  | { kind: 'done'; ok: boolean; message?: string };
