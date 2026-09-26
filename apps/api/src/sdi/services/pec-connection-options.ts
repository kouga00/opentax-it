/**
 * Connection options shared by SMTP and IMAP. Always implicit SSL/TLS (`secure: true`), as every preset provider
 * requires. Timeouts in milliseconds: long enough for a slow provider, short enough for a request the user waits on.
 */
export const PEC_TIMEOUTS = { connectionTimeout: 15_000, greetingTimeout: 15_000, socketTimeout: 60_000 };
