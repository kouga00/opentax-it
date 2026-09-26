import { describe, expect, it } from 'vitest';
import { pecErrorMessage } from './pec-errors.js';

describe('pecErrorMessage', () => {
  it('explains authentication failures from nodemailer and imapflow', () => {
    expect(pecErrorMessage({ code: 'EAUTH' }, 'SMTP')).toContain('password');
    expect(pecErrorMessage({ authenticationFailed: true }, 'IMAP')).toContain('server IMAP rifiutato');
  });

  it('never repeats the library message', () => {
    expect(pecErrorMessage(Object.assign(new Error('secret server detail'), { code: 'EWHATEVER' }), 'SMTP')).toBe('Errore di comunicazione con il server SMTP.');
    expect(pecErrorMessage(undefined, 'IMAP')).toBe('Errore di comunicazione con il server IMAP.');
  });

  it('points to the server name or port on network errors', () => {
    expect(pecErrorMessage({ code: 'EDNS' }, 'SMTP')).toContain('non trovato');
    expect(pecErrorMessage({ code: 'ETIMEDOUT' }, 'IMAP')).toContain('non risponde');
  });
});
