/**
 * The two ways to issue again an invoice rejected by SDI, which "si considera non emessa" (Circ. AdE 13/E/2018 §1.6):
 * - preferably the same invoice, corrected and sent again "con la data ed il numero del documento originario": the
 *   rejected invoice is reopened as a numbered draft (a correction);
 * - when that is not possible, "l'emissione di una fattura con nuovo numero e data [...] per la quale risulti un
 *   collegamento alla precedente fattura scartata da Sdi" (point a): a new invoice that replaces it.
 */

/** Draft of an invoice rejected by SDI, reopened for correction: it keeps its number. */
export const isCorrection = (invoice: { status: string; sequence: number | null }): boolean => invoice.status === 'DRAFT' && invoice.sequence !== null;

/**
 * Causale written on the replacing invoice, so that the link to the rejected one shows in the document itself. The
 * circular asks for the link but gives no wording: this text, with number, date and IdentificativoSdI of the rejected
 * file, is a choice of this app.
 */
export function replacementNote(rejected: { number: string; date: Date }, sdiId: string | null): string {
  const [y, m, d] = rejected.date.toISOString().slice(0, 10).split('-');
  return `Emessa in sostituzione della fattura n. ${rejected.number} del ${d}/${m}/${y}, scartata dallo SDI${sdiId ? ` (identificativo SdI ${sdiId})` : ''}`;
}
