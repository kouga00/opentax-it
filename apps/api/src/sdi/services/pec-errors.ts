/**
 * Turns an SMTP (nodemailer) or IMAP (imapflow) error into a message for the user. The library message is not
 * shown as it is: it can carry server responses and internal details.
 */
export function pecErrorMessage(err: unknown, server: 'SMTP' | 'IMAP'): string {
  const e = (err ?? {}) as { code?: string; authenticationFailed?: boolean; responseCode?: number };
  if (e.authenticationFailed || e.code === 'EAUTH' || e.code === 'ENOAUTH') {
    return `Accesso al server ${server} rifiutato: controlla nome utente e password della casella PEC.`;
  }
  if (e.code === 'EDNS' || e.code === 'ENOTFOUND' || e.code === 'EAI_AGAIN') return `Server ${server} non trovato: controlla il nome del server.`;
  if (e.code === 'ETIMEDOUT' || e.code === 'ETIMEOUT' || e.code === 'ECONNREFUSED' || e.code === 'ECONNECTION' || e.code === 'ESOCKET' || e.code === 'NoConnection') {
    return `Il server ${server} non risponde: controlla nome e porta del server e la connessione a internet.`;
  }
  if (e.code === 'ETLS') return `Connessione cifrata con il server ${server} non riuscita: controlla che la porta sia quella SSL/TLS.`;
  if (e.code === 'EENVELOPE') return 'Il server SMTP ha rifiutato il mittente o il destinatario del messaggio.';
  if (e.code === 'EMESSAGE' || (e.responseCode && e.responseCode >= 500)) return 'Il server SMTP ha rifiutato il messaggio.';
  return `Errore di comunicazione con il server ${server}.`;
}
