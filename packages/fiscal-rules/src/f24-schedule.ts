import { toIsoDate } from './calendar.js';
import { contributionScheme, type SocialSecuritySchemeId } from './contribution-schemes.js';
import { buildInstallmentPlan, type Installment } from './installment-plan.js';
import type { FiscalRuleSet } from './rule-set.js';
import { substituteTaxF24Rows } from './substitute-tax.js';

/**
 * F24 forms for the balance and advances of a tax year: one form per installment
 * (balance + first advance, split with interest) and one for the second advance.
 * Pure function; the caller persists the result and tracks payment status.
 *
 * The rows come from the tax and contribution modules (substitute-tax.ts → Treasury section, the
 * profile's scheme in contribution-schemes.ts → INPS section, none when the scheme is not computed),
 * each describing its codes as `F24SectionRows`; this module
 * only splits them into installments, adds interest and lays them out on the forms.
 *
 * Sources:
 * - AdE, "Avvertenze per la compilazione del mod. F24": "Se gli importi dovuti a titolo di
 *   saldo o di acconto sono pagati in unica soluzione, nelle colonne 'rateazione/regione/
 *   prov./mese rif.' della sezione 'Erario' ... indicare 0101; in caso di pagamento rateale
 *   ... la rata che sta pagando e il numero di rate prescelto (ad es., se versa la seconda di
 *   sei rate, deve indicare 0206)". The 0.40% surcharge for the 30-day deferral increases
 *   the amounts before splitting ("maggiorare preventivamente le somme da versare",
 *   Redditi PF 2026 instructions, booklet 1, "Rateazione").
 * - AdE, "Tabella codici tributo" (Erario, 04/01/2021): 1790 and 1792 take NNRR in the
 *   installment column; 1791 (second/single advance) and 1668 (installment interest) take
 *   "0000", i.e. the column is left blank; all four require the reference year (AAAA).
 * - Redditi PF 2026 instructions, booklet 1, §7: installment interest "non vanno cumulati
 *   all'imposta, ma versati separatamente mediante l'apposito codice tributo"; amounts
 *   from the return are whole euro, installments are rounded to the cent.
 * - INPS, "F24 per professionisti iscritti alla Gestione Separata": interest on a separate row,
 *   period "da 01AAAA a 12AAAA" of the reference year (the year the balance refers to; the
 *   following year for advances). Reasons and office code in inps-separate-scheme.ts.
 *
 * Design choice (documented in docs/compliance.md): interest rows are grouped per
 * reference year (one 1668 row and one DPPI row per year), matching the forms prepared
 * by an intermediary for the author; the instructions ask for the interest of a section
 * "in un unico rigo", which is not possible when two reference years are involved.
 */

export type F24Section = 'TREASURY' | 'INPS' | 'REGIONAL' | 'LOCAL' | 'OTHER_ENTITY';
export type F24LineRole = 'BALANCE' | 'FIRST_ADVANCE' | 'SECOND_ADVANCE' | 'INTEREST' | 'CREDIT' | 'OTHER';

export interface F24LineDraft {
  section: F24Section;
  role: F24LineRole;
  /** Treasury tax code or INPS reason. */
  code: string;
  /** INPS office code (Treasury lines: undefined). */
  officeCode?: string;
  /** INPS "matricola/codice INPS"; other entities "codice posizione". */
  positionCode?: string;
  /** Treasury "rateazione" column: NNRR or 0101; undefined when the table says 0000. */
  installmentCode?: string;
  /** Region code / municipality cadastral code (regional and local sections). */
  localCode?: string;
  /** INPS period MM/YYYY. */
  periodFrom?: string;
  periodTo?: string;
  referenceYear: number;
  debitAmount: number;
  /**
   * Part of `debitAmount` that is the deferral surcharge (Treasury rows only; for INPS it goes on DPPI).
   * Excluded when paid advances are carried to the return (Redditi PF booklet 3, LM45: "non devono
   * essere considerate le maggiorazioni").
   */
  surchargeAmount?: number;
  creditAmount?: number;
  description: string;
}

export type F24DraftKind = 'BALANCE' | 'INSTALLMENT' | 'SECOND_ADVANCE' | 'COMPENSATION';

export interface F24Draft {
  kind: F24DraftKind;
  paymentDate: Date;
  installmentNumber?: number;
  installmentsTotal?: number;
  lines: F24LineDraft[];
  totalDebit: number;
  totalCredit: number;
}

/** A balance or advance of one section, with its F24 code; the amount is `PaymentScheduleAmounts[key]`. */
export interface F24Debt {
  key: keyof PaymentScheduleAmounts;
  role: F24LineRole;
  code: string;
  referenceYear: number;
  /** INPS "matricola/codice INPS" of the row (Artigiani and Commercianti: the code of the year). */
  positionCode?: string;
  description: string;
}

/** What a tax or contribution module puts on the F24 forms of a tax year. */
export interface F24SectionRows {
  section: F24Section;
  /** Balance and first advance: split into the installments, offset in this order by a compensation. */
  debts: F24Debt[];
  /** Second or single advance, paid on its own form (30 November). */
  secondAdvance?: F24Debt;
  /** Code of the installment interest row. */
  interestCode: string;
  /** INPS office code on every row of the section. */
  officeCode?: string;
  /** The deferral surcharge is paid on the interest row (INPS: DPPI) instead of inside the debt rows (Treasury). */
  surchargeWithInterest: boolean;
}

export interface PaymentScheduleAmounts {
  /** LM46: substitute tax balance due (whole euro; ≤ 0 means a credit, no line). */
  taxBalance: number;
  /** First advance for the following year (RN62 col. 1 logic applied to the substitute tax). */
  taxFirstAdvance: number;
  /** Second or single advance for the following year, 30 November. */
  taxSecondAdvance: number;
  /** RR7: INPS contribution balance due. */
  inpsBalance: number;
  inpsFirstAdvance: number;
  inpsSecondAdvance: number;
}

export interface PaymentScheduleInput {
  /** Income year the balance refers to (advances refer to taxYear + 1). */
  taxYear: number;
  amounts: PaymentScheduleAmounts;
  /** Scheme of the profile; default: Gestione Separata. */
  contributionScheme?: SocialSecuritySchemeId;
  /** Artigiani and Commercianti: INPS code of the contribution above the minimum, by year. */
  inpsPositionCodes?: Partial<Record<number, string>>;
  inpsOfficeCode: string;
  /** 24% rate: reasons P10/P10R instead of PXX/PXXR. */
  inpsReducedRate: boolean;
  /** Due date of the balance and first advance (ordinary, extended or deferred). */
  firstDueDate: Date;
  /**
   * Surcharge when the deferred date is used (0.40 / 0.80), applied before splitting. Treasury:
   * added to the tax amount (Redditi PF instructions, booklet 1, §7: "maggiorare preventivamente le
   * somme"). INPS: paid with DPPI together with the interest (Circ. INPS 62/2026 §3-4: "per il
   * pagamento degli interessi comprensivi anche della maggiorazione devono essere utilizzate le
   * causali … DPPI"), so the contribution rows carry the amount without surcharge.
   */
  surchargePct?: number;
  /** 1 = single payment. */
  installments: number;
  secondAdvanceDate: Date;
}

export interface PaymentSchedule {
  forms: F24Draft[];
  /** Lines below the F24 minimum per code (EUR 1.03, Redditi PF instructions §7) and similar remarks. */
  warnings: string[];
}

/** "Rateazione" column when the balance/advance is paid in a single payment. */
export const SINGLE_PAYMENT_INSTALLMENT_CODE = '0101';
/** Minimum amount per tax code on the F24 (Redditi PF 2026 instructions, booklet 1, §7). */
export const F24_MIN_LINE_AMOUNT = 1.03;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const pad2 = (n: number) => String(n).padStart(2, '0');

export function installmentCode(number: number, total: number): string {
  return `${pad2(number)}${pad2(total)}`;
}

interface Component extends F24Debt {
  rows: F24SectionRows;
  plan: Installment[];
  /** With a deferral surcharge: the same plan without it, to tell the surcharge share of each installment. */
  basePlan?: Installment[];
}

export function buildPaymentSchedule(rules: FiscalRuleSet, input: PaymentScheduleInput): PaymentSchedule {
  const { taxYear, amounts, installments } = input;
  const surcharge = input.surchargePct ?? 0;
  const single = installments === 1;
  const sections = [substituteTaxF24Rows(rules, taxYear), ...contributionRows(rules, input, single)];
  const warnings: string[] = [];

  const planFor = (amount: number, withSurcharge = true): Installment[] =>
    buildInstallmentPlan({
      amount: withSurcharge ? round2(amount * (1 + surcharge / 100)) : amount,
      firstDueDate: input.firstDueDate,
      installments,
      installmentDay: rules.deadlines.installmentDay,
      end: rules.deadlines.installmentsEnd,
      interest: { annualPct: rules.installments.annualInterestPct, incrementPct: rules.installments.incrementPct },
    });

  const components: Component[] = sections.flatMap((rows) =>
    rows.debts
      .filter((d) => amounts[d.key] > 0)
      .map((d) => ({ ...d, rows, plan: planFor(amounts[d.key]), basePlan: surcharge > 0 ? planFor(amounts[d.key], false) : undefined })),
  );

  const forms: F24Draft[] = [];
  if (components.length > 0) {
    const dates = components[0].plan.map((r) => r.dueDate);
    for (let i = 0; i < installments; i++) {
      const lines: F24LineDraft[] = [];
      const interestByYear = new Map<string, { rows: F24SectionRows; referenceYear: number; positionCode?: string; amount: number }>();
      for (const c of components) {
        const r = c.plan[i];
        const treasury = c.rows.section === 'TREASURY';
        // Deferral surcharge share of this installment: inside the debt row, or moved to the interest row (INPS: DPPI).
        const surchargeShare = c.basePlan ? round2(r.principal - c.basePlan[i].principal) : 0;
        const withInterest = c.rows.surchargeWithInterest ? surchargeShare : 0;
        lines.push(line(c.rows.section, c.role, c.code, c.referenceYear, round2(r.principal - withInterest), c.description, {
          surchargeAmount: !c.rows.surchargeWithInterest && surchargeShare > 0 ? surchargeShare : undefined,
          installmentCode: treasury ? (single ? SINGLE_PAYMENT_INSTALLMENT_CODE : installmentCode(i + 1, installments)) : undefined,
          officeCode: c.rows.officeCode,
          positionCode: c.positionCode,
        }));
        if (r.interest > 0 || withInterest > 0) {
          const k = `${c.rows.section}-${c.referenceYear}`;
          const cur = interestByYear.get(k) ?? { rows: c.rows, referenceYear: c.referenceYear, positionCode: c.positionCode, amount: 0 };
          cur.amount = round2(cur.amount + r.interest + withInterest);
          interestByYear.set(k, cur);
        }
      }
      for (const it of interestByYear.values()) {
        const label = it.rows.surchargeWithInterest && surcharge > 0 ? `Interest and ${surcharge}% deferral surcharge ${it.referenceYear}` : `Installment interest ${it.referenceYear} (${rules.installments.annualInterestPct}% per year)`;
        lines.push(line(it.rows.section, 'INTEREST', it.rows.interestCode, it.referenceYear, it.amount, label, { officeCode: it.rows.officeCode, positionCode: it.positionCode }));
      }
      forms.push(form(single ? 'BALANCE' : 'INSTALLMENT', dates[i], lines, single ? undefined : { number: i + 1, total: installments }));
    }
  }

  const second: F24LineDraft[] = [];
  for (const rows of sections) {
    const d = rows.secondAdvance;
    if (d && amounts[d.key] > 0) second.push(line(rows.section, d.role, d.code, d.referenceYear, amounts[d.key], d.description, { officeCode: rows.officeCode, positionCode: d.positionCode }));
  }
  if (second.length > 0) forms.push(form('SECOND_ADVANCE', input.secondAdvanceDate, second));

  for (const f of forms) {
    for (const l of f.lines) {
      if (l.debitAmount < F24_MIN_LINE_AMOUNT) warnings.push(`${toIsoDate(f.paymentDate).split('-').reverse().join('/')} ${l.code} ${l.referenceYear}: importo ${l.debitAmount.toFixed(2).replace('.', ',')} € inferiore al minimo F24 di ${F24_MIN_LINE_AMOUNT.toFixed(2).replace('.', ',')} € per codice tributo`);
    }
  }
  return { forms, warnings };
}

/** Rows of the profile's contribution scheme; none when OpenTax IT does not compute it. */
function contributionRows(
  rules: FiscalRuleSet,
  input: { taxYear: number; contributionScheme?: SocialSecuritySchemeId; inpsOfficeCode: string; inpsReducedRate: boolean; inpsPositionCodes?: Partial<Record<number, string>> },
  single: boolean,
): F24SectionRows[] {
  const scheme = contributionScheme(input.contributionScheme ?? 'INPS_SEPARATE', rules);
  if (!scheme) return [];
  return [scheme.f24Rows(rules, { taxYear: input.taxYear, inpsOfficeCode: input.inpsOfficeCode, reducedRate: input.inpsReducedRate, single, positionCodes: input.inpsPositionCodes })];
}

function line(section: F24Section, role: F24LineRole, code: string, referenceYear: number, amount: number, description: string, extra: { installmentCode?: string; officeCode?: string; positionCode?: string; surchargeAmount?: number }): F24LineDraft {
  return {
    section,
    role,
    code,
    officeCode: extra.officeCode,
    positionCode: extra.positionCode,
    installmentCode: extra.installmentCode,
    periodFrom: section === 'INPS' ? `01/${referenceYear}` : undefined,
    periodTo: section === 'INPS' ? `12/${referenceYear}` : undefined,
    referenceYear,
    debitAmount: round2(amount),
    surchargeAmount: extra.surchargeAmount,
    description,
  };
}

function form(kind: F24DraftKind, paymentDate: Date, lines: F24LineDraft[], installment?: { number: number; total: number }): F24Draft {
  return {
    kind,
    paymentDate,
    installmentNumber: installment?.number,
    installmentsTotal: installment?.total,
    lines,
    totalDebit: round2(lines.reduce((s, l) => s + l.debitAmount, 0)),
    totalCredit: round2(lines.reduce((s, l) => s + (l.creditAmount ?? 0), 0)),
  };
}

// ───────────────────────── Compensation ─────────────────────────

/**
 * Sources:
 * - Redditi PF 2026 instructions, booklet 1, §8 "La compensazione": credits and debts towards
 *   different bodies (State, INPS, local bodies) are offset on the F24; the form must be filed
 *   even when the balance is zero; credits above EUR 5,000 per year from the 10th day after
 *   filing (art. 3 D.Lgs. 33/2025) and with the compliance visa (L. 147/2013 art. 1 par. 574);
 *   forms with compensation only through AdE telematic services (art. 37 par. 49-bis DL
 *   223/2006; art. 11 par. 2 lett. a DL 66/2014).
 * - AdE "Avvertenze per la compilazione del mod. F24", "Compensazione e rateazione": two
 *   forms, "il primo con saldo finale eguale a zero per utilizzare il credito da compensare e
 *   con l'indicazione 0101 nello spazio rateazione in corrispondenza dell'importo a debito
 *   versato; il secondo per evidenziare l'importo della prima rata da versare del residuo
 *   debito". The real 2026 forms of the author follow it (IRPEF 4001 and municipal surtax 3844
 *   credits against the INPS balance PXX; the residual INPS balance in the installments).
 * - Which debt to cover first is the taxpayer's choice (the instructions set no order):
 *   `order` makes it explicit.
 */

export interface AvailableCredit {
  id: string;
  section: F24Section;
  code: string;
  referenceYear: number;
  /** Remaining amount. */
  amount: number;
  localCode?: string;
  installmentCode?: string;
  description?: string;
}

export type CompensationOrder = 'INPS_FIRST' | 'TAX_FIRST';

export interface CompensationInput {
  taxYear: number;
  amounts: PaymentScheduleAmounts;
  /** Scheme of the profile; default: Gestione Separata. */
  contributionScheme?: SocialSecuritySchemeId;
  /** Artigiani and Commercianti: INPS code of the contribution above the minimum, by year. */
  inpsPositionCodes?: Partial<Record<number, string>>;
  inpsOfficeCode: string;
  inpsReducedRate: boolean;
  /** Date of the zero-balance form (the balance/first advance due date). */
  date: Date;
  credits: AvailableCredit[];
  order: CompensationOrder;
}

export interface CompensationResult {
  /** Zero-balance form; undefined when there is nothing to offset. */
  form?: F24Draft;
  /** Amounts still due after the compensation, to split or pay. */
  amounts: PaymentScheduleAmounts;
  usages: Array<{ creditId: string; amount: number }>;
  /** Credit left after the form. */
  unusedCredit: number;
}

const CREDIT_DEFAULT_INSTALLMENT_CODE = SINGLE_PAYMENT_INSTALLMENT_CODE;

export function buildCompensation(rules: FiscalRuleSet, input: CompensationInput): CompensationResult {
  const { taxYear, amounts } = input;
  let available = round2(input.credits.reduce((s, c) => s + c.amount, 0));
  const residual = { ...amounts };
  if (available <= 0) return { amounts: residual, usages: [], unusedCredit: 0 };

  // Offset rows are paid in full: single-payment codes (PXX/P10 for INPS, 0101 for the Treasury).
  const inps = contributionRows(rules, input, true);
  const treasury = substituteTaxF24Rows(rules, taxYear);
  const sections = input.order === 'TAX_FIRST' ? [treasury, ...inps] : [...inps, treasury];
  const debts = sections.flatMap((rows) => rows.debts.map((d) => ({ ...d, rows })));

  const lines: F24LineDraft[] = [];
  let covered = 0;
  for (const d of debts) {
    if (available <= 0) break;
    const due = residual[d.key];
    if (due <= 0) continue;
    const part = round2(Math.min(due, available));
    lines.push(line(d.rows.section, d.role, d.code, d.referenceYear, part, `${d.description} (offset)`, {
      installmentCode: d.rows.section === 'TREASURY' ? SINGLE_PAYMENT_INSTALLMENT_CODE : undefined,
      officeCode: d.rows.officeCode,
      positionCode: d.positionCode,
    }));
    residual[d.key] = round2(due - part);
    available = round2(available - part);
    covered = round2(covered + part);
  }
  if (covered === 0) return { amounts: residual, usages: [], unusedCredit: round2(available) };

  // Credit rows, in the order given, until the covered amount is matched.
  const usages: CompensationResult['usages'] = [];
  let toMatch = covered;
  for (const c of input.credits) {
    if (toMatch <= 0) break;
    const used = round2(Math.min(c.amount, toMatch));
    if (used <= 0) continue;
    lines.push({
      section: c.section,
      role: 'CREDIT',
      code: c.code,
      installmentCode: c.installmentCode ?? (c.section === 'INPS' ? undefined : CREDIT_DEFAULT_INSTALLMENT_CODE),
      localCode: c.localCode,
      officeCode: c.section === 'INPS' ? input.inpsOfficeCode : undefined,
      periodFrom: c.section === 'INPS' ? `01/${c.referenceYear}` : undefined,
      periodTo: c.section === 'INPS' ? `12/${c.referenceYear}` : undefined,
      referenceYear: c.referenceYear,
      debitAmount: 0,
      creditAmount: used,
      description: c.description ?? `Credit ${c.code} ${c.referenceYear}`,
    });
    usages.push({ creditId: c.id, amount: used });
    toMatch = round2(toMatch - used);
  }
  return { form: form('COMPENSATION', input.date, lines), amounts: residual, usages, unusedCredit: round2(available) };
}
