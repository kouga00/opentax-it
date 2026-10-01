/**
 * Due dates and amounts of the installments of a document from its payment terms: one DettaglioPagamento per
 * installment under CondizioniPagamento TP01 ("pagamento a rate"), a single one under TP02 ("pagamento completo")
 * (Spec. FatturaPA 1.9.1 §2.1.10). The days run from the invoice date; with "fine mese" (f.m.) the due date then moves to
 * the last day of its month, as the software used by the author does ("30 gg f.m." on an invoice of 30/09/2026 falls
 * on 31/10/2026): a commercial convention, not a FatturaPA rule, since the specification only asks for the due date.
 * The total is split in equal installments in whole cents, the remainder on the last one: a project choice, the
 * specification only asks for the amount of each.
 */

export interface PaymentTermsSchedule {
  /** Days of each installment from the invoice date, e.g. [30, 60, 90]. */
  dueDays: number[];
  /** "Fine mese": each due date moves to the last day of its month. */
  fromMonthEnd: boolean;
}

export interface Installment {
  dueDate: string;
  amount: number;
}

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const endOfMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));

export function paymentSchedule(invoiceDate: string, total: number, terms: PaymentTermsSchedule): Installment[] {
  const days = terms.dueDays.length > 0 ? terms.dueDays : [0];
  const from = new Date(`${invoiceDate}T00:00:00Z`);
  const cents = Math.round(total * 100);
  const each = Math.floor(cents / days.length);
  return days.map((n, i) => {
    const due = new Date(from.getTime() + n * 86_400_000);
    return {
      dueDate: isoDate(terms.fromMonthEnd ? endOfMonth(due) : due),
      amount: (i === days.length - 1 ? cents - each * (days.length - 1) : each) / 100,
    };
  });
}

/** "30/60/90 gg f.m." style label of the terms. */
export function termsLabel(terms: PaymentTermsSchedule): string {
  const days = terms.dueDays.length > 0 ? terms.dueDays : [0];
  if (days.length === 1 && days[0] === 0) return terms.fromMonthEnd ? 'a fine mese' : 'a vista';
  return `${days.join('/')} gg ${terms.fromMonthEnd ? 'fine mese' : 'data fattura'}`;
}
