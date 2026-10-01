import type { Invoice } from './types';

/**
 * Whether an invoice can be sent to SDI from here: numbered and not sent yet, not imported (sent with another tool),
 * and not to a public administration (it needs a qualified signature, not supported yet). Plain module: used both by
 * server pages and by client components.
 */
export const canSendToSdi = (i: Pick<Invoice, 'status' | 'imported' | 'customer'>) => i.status === 'ISSUED' && !i.imported && i.customer.kind !== 'IT_PA';

/** Name of each document type (TipoDocumento). */
export const TYPE_LABELS: Record<string, string> = { TD01: 'Fattura', TD04: 'Nota di credito', TD05: 'Nota di debito', TD06: 'Parcella' };

/**
 * Rejected invoices can be corrected and sent again, or replaced with a new number, from here: not when they were sent
 * with another tool or were already replaced.
 */
export const canCorrect = (invoice: Pick<Invoice, 'status' | 'imported' | 'replacedBy'>): boolean => invoice.status === 'REJECTED' && !invoice.imported && !invoice.replacedBy;

/** Why and how a rejected invoice is sent again (Circ. AdE 13/E/2018 §1.6). */
export const CORRECTION_RULE = 'Lo scarto significa che la fattura non è mai stata emessa. La circolare AdE 13/E/2018 (§1.6) chiede di reinviarla preferibilmente entro cinque giorni dalla notifica di scarto, con lo stesso numero e la stessa data; il file avrà un nuovo nome.';

/** The alternative when the same number and date are not possible (Circ. AdE 13/E/2018 §1.6, a). */
export const REPLACEMENT_RULE = 'Se non è possibile reinviarla con lo stesso numero e la stessa data, la circolare ammette una nuova fattura con nuovo numero e nuova data, collegata a quella scartata: il collegamento va tra le diciture della nuova fattura, con numero, data e identificativo SdI della scartata (testo scelto da questa app: la circolare non ne dà uno). La fattura scartata resta non emessa.';
