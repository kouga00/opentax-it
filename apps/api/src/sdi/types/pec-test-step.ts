/** Steps of the PEC mailbox test, in order. IMAP connection and login happen in one imapflow call (PecImapService). */
export const PEC_TEST_STEPS = ['SMTP_CONNECT', 'SMTP_LOGIN', 'IMAP_CONNECT', 'IMAP_LOGIN'] as const;
export type PecTestStep = (typeof PEC_TEST_STEPS)[number];
