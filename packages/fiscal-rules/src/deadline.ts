import { nextBusinessDay, parseIsoDate, toIsoDate } from './calendar.js';

/** A deadline of the calendar, and the helper that moves it to the next business day (DL 70/2011 art. 7). */

export type DeadlineKind =
  | 'TAX_BALANCE'
  | 'TAX_FIRST_ADVANCE'
  | 'TAX_SECOND_ADVANCE'
  | 'INPS_BALANCE'
  | 'INPS_FIRST_ADVANCE'
  | 'INPS_SECOND_ADVANCE'
  /** INPS Artigiani and Commercianti: installment of the contribution on the minimum income. */
  | 'INPS_FIXED_INSTALLMENT'
  | 'STAMP_DUTY'
  /** Stamp duty: last day to check and change list B on the AdE portal. */
  | 'STAMP_DUTY_LIST_B'
  | 'TAX_RETURN'
  | 'INTRASTAT';

export interface Deadline {
  kind: DeadlineKind;
  /** Nominal date from the law/instructions. */
  nominalDate: string;
  /** Effective date after moving to the next business day. */
  date: string;
  description: string;
  /** Structured details so that user interfaces can localize the description. */
  details: {
    taxYear: number;
    percentage?: number;
    /** Stamp duty quarter; installment number of the INPS fixed contribution. */
    quarter?: number;
    splittable?: boolean;
    /** Stamp duty: amount due for the quarter, and the ordinary date when the deferral moved the deadline. */
    amount?: number;
    deferredFrom?: string;
    /** Stamp duty: day by which the AdE shows the amount due on the portal. */
    amountAvailableOn?: string;
    /** Stamp duty: the quarter has invoices without an SDI delivery date, placed by their own date instead. */
    estimated?: boolean;
  };
  /** F24 tax code / INPS reason to use, when applicable. */
  code?: string;
  source?: string;
}

export function deadline(
  kind: DeadlineKind,
  nominal: string,
  description: string,
  details: Deadline['details'],
  code?: string,
  source?: string,
): Deadline {
  return { kind, nominalDate: nominal, date: toIsoDate(nextBusinessDay(parseIsoDate(nominal))), description, details, code, source };
}
