/**
 * Installment plan ("rateazione") for the balance and first advance payment of taxes
 * and INPS contributions.
 *
 * Sources:
 * - D.Lgs. 24 March 2025 no. 33 (consolidated act on payments and collection), art. 10:
 *   equal monthly installments with interest, each by the 16th of the month; the plan
 *   must be completed by 16 December of the same year. Art. 11: deadlines falling
 *   between 1 and 20 August move to 20 August.
 *   (In force from 1/1/2026; previously art. 20 D.Lgs. 241/97 as amended by
 *   D.Lgs. 1/2024 art. 8, applicable from the 2023 balance.)
 * - DM 21 May 2009 art. 5 (GU 15/06/2009): interest at 4% per year.
 * - Redditi PF 2026 instructions, booklet 1, "Rateazione": "interessi nella misura del
 *   4 per cento annuo, da calcolarsi secondo il metodo commerciale, tenendo conto del
 *   periodo decorrente dal giorno successivo a quello di scadenza della prima rata fino
 *   alla data di scadenza della seconda"; on the following monthly installments
 *   "interessi dello 0,33 per cento in misura forfetaria". Interest is paid separately
 *   (tax code 1668; INPS reason DPPI).
 *
 * Implementation of that text: the second installment carries 4% × D / 360, where D
 * is the number of days, counted with the commercial method (30-day months), from the
 * day after the first due date to the nominal due date of the second installment
 * (the 16th of the following month; the August deferral to the 20th is a payment
 * facility and does not enter the computation). Each later installment adds 0.33
 * percentage points. Percentages are rounded to two decimals.
 *
 * This reproduces the official table for both published start dates (30/6 → 0.18,
 * 0.51, …; 30/7 → 0.18, 0.51, …) and, for the 2026 flat-rate extension (first
 * installment 20/7 → 0.29, 0.62, 0.95, …), the amounts of real F24 forms prepared by
 * an intermediary (see installment-plan.test.ts).
 *
 * The number of installments is NOT fixed: it depends on the first due date
 * (30/6 ordinary, 30/7 with 0.40% surcharge, or the date of a yearly extension).
 * That is why the computation always starts from the actual first date.
 */

export interface InstallmentPlanParams {
  /** Total amount to split, already increased by the surcharge when the deferral is used. */
  amount: number;
  /** Due date of the first installment (e.g. 2026-06-30, 2026-07-20 with the extension). */
  firstDueDate: Date;
  /** Number of installments chosen by the taxpayer; defaults to the maximum allowed. */
  installments?: number;
  /** Day of month for installments after the first (art. 10 par. 4: 16). */
  installmentDay?: number;
  /** Month/day by which the plan must be completed (art. 10 par. 1: 16 December). */
  end?: { month: number; day: number };
  /** Interest: annual rate applied to the second installment (commercial method) and forfait increment for each following one. */
  interest?: { annualPct: number; incrementPct: number };
}

/**
 * Days between two dates with the commercial method (30-day months, 360-day year),
 * from `from` (exclusive) to `to` (inclusive). The 31st counts as the 30th.
 */
export function commercialDays(from: Date, to: Date): number {
  const d = (x: Date) => [x.getUTCFullYear(), x.getUTCMonth() + 1, Math.min(x.getUTCDate(), 30)] as const;
  const [y1, m1, d1] = d(from);
  const [y2, m2, d2] = d(to);
  return (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1);
}

/** Interest percentage on the second installment: annual rate × commercial days / 360, rounded to 2 decimals. */
export function secondInstallmentInterestPct(firstDueDate: Date, secondNominalDueDate: Date, annualPct: number): number {
  return round2((annualPct * commercialDays(firstDueDate, secondNominalDueDate)) / 360);
}

export interface Installment {
  number: number;
  dueDate: Date;
  principal: number;
  /** Interest percentage applied to the principal (0 on the first installment). */
  interestPct: number;
  interest: number;
  total: number;
}

const DEFAULT_INSTALLMENT_DAY = 16;
const DEFAULT_END = { month: 12, day: 16 };
const DEFAULT_INTEREST = { annualPct: 4, incrementPct: 0.33 };

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

/** Art. 11 D.Lgs. 33/2025: deadlines from 1 to 20 August are due by 20 August without surcharge. */
export function applyAugustDeferral(date: Date): Date {
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  if (m === 8 && d >= 1 && d <= 20) {
    return utc(date.getUTCFullYear(), 8, 20);
  }
  return date;
}

/** Nominal due date of the installment after the first: the installment day of the following month. */
export function secondNominalDueDate(firstDueDate: Date, installmentDay = DEFAULT_INSTALLMENT_DAY): Date {
  return utc(firstDueDate.getUTCFullYear(), firstDueDate.getUTCMonth() + 2, installmentDay);
}

/** Due dates after the first: the 16th of each following month, up to and including 16 December. */
export function maxInstallmentDates(
  firstDueDate: Date,
  installmentDay = DEFAULT_INSTALLMENT_DAY,
  end = DEFAULT_END,
): Date[] {
  const year = firstDueDate.getUTCFullYear();
  const limit = utc(year, end.month, end.day);
  if (firstDueDate.getTime() > limit.getTime()) {
    throw new Error('The first installment is later than the end of the installment period');
  }
  const out: Date[] = [firstDueDate];
  let month = firstDueDate.getUTCMonth() + 2; // next month (1-based)
  while (month <= end.month) {
    const due = applyAugustDeferral(utc(year, month, installmentDay));
    if (due.getTime() > limit.getTime()) break;
    out.push(due);
    month += 1;
  }
  return out;
}

export function maxInstallments(firstDueDate: Date): number {
  return maxInstallmentDates(firstDueDate).length;
}

export function buildInstallmentPlan(params: InstallmentPlanParams): Installment[] {
  const installmentDay = params.installmentDay ?? DEFAULT_INSTALLMENT_DAY;
  const end = params.end ?? DEFAULT_END;
  const interest = params.interest ?? DEFAULT_INTEREST;

  const dates = maxInstallmentDates(params.firstDueDate, installmentDay, end);
  const n = params.installments ?? dates.length;
  if (n < 1 || n > dates.length) {
    throw new Error(
      `Invalid number of installments: ${n} (max ${dates.length} starting from ${params.firstDueDate.toISOString().slice(0, 10)})`,
    );
  }

  const principal = round2(params.amount / n);
  const secondPct = secondInstallmentInterestPct(params.firstDueDate, secondNominalDueDate(params.firstDueDate, installmentDay), interest.annualPct);
  const plan: Installment[] = [];
  let remaining = round2(params.amount);
  for (let i = 0; i < n; i++) {
    const isLast = i === n - 1;
    const p = isLast ? remaining : principal; // the last one absorbs rounding
    remaining = round2(remaining - p);
    const pct = i === 0 ? 0 : round2(secondPct + interest.incrementPct * (i - 1));
    const int = round2((p * pct) / 100);
    plan.push({
      number: i + 1,
      dueDate: dates[i],
      principal: p,
      interestPct: pct,
      interest: int,
      total: round2(p + int),
    });
  }
  return plan;
}
