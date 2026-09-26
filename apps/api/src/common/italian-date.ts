/** Today in Italy, as YYYY-MM-DD: invoice dates are in the taxpayer's calendar, not in UTC. */
export const todayInItaly = (now = new Date()): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(now);

/** SDI rejects an invoice "successiva alla data di ricezione" (Spec. FatturaPA 1.9.1, error 00403). */
export const FUTURE_INVOICE_DATE = 'La data della fattura non può essere successiva a oggi: lo SDI la scarta (errore 00403)';
