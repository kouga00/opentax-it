/** The day of a moment in Italy, as YYYY-MM-DD: invoice dates are in the taxpayer's calendar, not in UTC. */
export const dayInItaly = (moment: Date): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(moment);

/** Today in Italy, as YYYY-MM-DD. */
export const todayInItaly = (now = new Date()): string => dayInItaly(now);

/** SDI rejects an invoice "successiva alla data di ricezione" (Spec. FatturaPA 1.9.1, error 00403). */
export const FUTURE_INVOICE_DATE = 'La data della fattura non può essere successiva a oggi: lo SDI la scarta (errore 00403)';

const ZONED = /(?:Z|[+-]\d{2}:?\d{2})$/;

/**
 * An xsd:dateTime of an SDI receipt as a Date. With a zone it is taken as it is; without one (the official MC example
 * has "2013-06-06T12:00:00") it is read as Italian time (Europe/Rome), not in the server's time zone. No official
 * source states the zone of such values: reading them as Italian time is a choice of this app, to be verified (TODO).
 */
export function parseSdiDateTime(value: string): Date | undefined {
  const zoned = ZONED.test(value);
  const provisional = new Date(zoned ? value : `${value}Z`);
  if (Number.isNaN(provisional.getTime())) return undefined;
  if (zoned) return provisional;
  // The same wall-clock time in Rome: subtract Rome's offset from UTC at that moment.
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      .formatToParts(provisional)
      .map((p) => [p.type, Number(p.value)]),
  );
  const romeAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return new Date(provisional.getTime() - (romeAsUtc - provisional.getTime()));
}
