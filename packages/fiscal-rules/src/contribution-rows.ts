import { SELF_EMPLOYED_ROW_REASONS } from './inps-self-employed.js';
import { findOtherEntity, type ContributionDeduction } from './other-entities.js';

/**
 * F24 rows of contributions that the app does not compute from the tax return: entered by the taxpayer as the
 * entity communicates them (or produced by a scheme's own calculation), paid in the INPS section or in the second box
 * of "Altri enti previdenziali e assicurativi".
 *
 * Strategy pattern with a registry by section: each section has its own rules, with the data of its module
 * (other-entities.ts for the professional funds, inps-self-employed.ts for the Artigiani and Commercianti reasons of the
 * INPS section; the Gestione Separata rows come from the tax return plan), so a new entity or scheme is added without
 * touching the others. A section without rules is refused.
 */

export type ContributionSection = 'INPS' | 'OTHER_ENTITY';

export interface ContributionRowInput {
  section: ContributionSection;
  /** Other entities: "codice ente". */
  entityCode?: string;
  /** "codice sede". */
  officeCode?: string;
  /** "causale contributo". */
  reason: string;
  /** INPS "matricola/codice INPS"; other entities "codice posizione". */
  positionCode?: string;
  /** "MM/YYYY", or "YYYY" where the entity asks for the year only. */
  periodFrom?: string;
  periodTo?: string;
  amount: number;
  /** Deductible part (LM35), asked only when one reason mixes deductible and non-deductible contributions. */
  deductibleAmount?: number;
}

export interface ContributionRowCheck {
  errors: string[];
  /** Part of the amount deducted from the flat-rate income when paid (LM35). */
  deductibleAmount: number;
  deduction: ContributionDeduction;
  /** Reason description, for the row. */
  description: string;
}

interface SectionRules {
  check(row: ContributionRowInput): ContributionRowCheck;
}

const MONTH_YEAR = /^(0[1-9]|1[0-2])\/\d{4}$/;
const YEAR = /^\d{4}$/;

/** "MM/YYYY" → comparable number YYYYMM. */
const periodValue = (p: string) => Number(p.slice(3) + p.slice(0, 2));

/** Deductible part from the reason's classification (see ContributionDeduction). */
function deductible(deduction: ContributionDeduction, row: ContributionRowInput, errors: string[]): number {
  if (deduction === 'YES') return row.amount;
  if (deduction !== 'MIXED') return 0;
  const part = row.deductibleAmount ?? 0;
  if (part < 0 || part > row.amount) errors.push('La parte deducibile deve essere tra zero e l\'importo della riga');
  return Math.min(Math.max(part, 0), row.amount);
}

const otherEntityRules: SectionRules = {
  check(row) {
    const errors: string[] = [];
    const entity = row.entityCode ? findOtherEntity(row.entityCode) : undefined;
    if (!entity) return { errors: [`Codice ente ${row.entityCode ?? '(mancante)'} non gestito nella sezione "Altri enti previdenziali"`], deductibleAmount: 0, deduction: 'UNKNOWN', description: '' };
    const reason = entity.reasons.find((r) => r.code === row.reason);
    if (!reason) errors.push(`La causale ${row.reason} non è tra quelle di ${entity.name}`);
    if (row.officeCode) errors.push(`Per ${entity.name} il codice sede resta vuoto`);
    if (entity.positionCode === 'REQUIRED' && !/^\d{1,9}$/.test(row.positionCode ?? '')) errors.push(`Per ${entity.name} serve il codice posizione comunicato dalla cassa (fino a 9 cifre)`);
    if (entity.positionCode === 'NONE' && row.positionCode) errors.push(`Per ${entity.name} il codice posizione resta vuoto`);
    if (entity.period === 'YEAR') {
      if (!YEAR.test(row.periodFrom ?? '') || row.periodTo) errors.push(`Per ${entity.name} il periodo è solo l'anno (AAAA), senza fine`);
    } else if (!MONTH_YEAR.test(row.periodFrom ?? '') || !MONTH_YEAR.test(row.periodTo ?? '')) {
      errors.push('Periodo di riferimento da MM/AAAA a MM/AAAA');
    } else if (periodValue(row.periodFrom!) > periodValue(row.periodTo!)) {
      errors.push('L\'inizio del periodo non può essere dopo la fine');
    }
    if (!(row.amount > 0)) errors.push('L\'importo deve essere maggiore di zero');
    const deduction = reason?.deduction ?? 'UNKNOWN';
    return { errors, deductibleAmount: deductible(deduction, row, errors), deduction, description: reason ? `${entity.name} - ${reason.description}` : '' };
  },
};

const selfEmployedRules: SectionRules = {
  check(row) {
    const errors: string[] = [];
    const reason = SELF_EMPLOYED_ROW_REASONS.find((r) => r.artisans === row.reason || r.traders === row.reason);
    if (!reason) errors.push(`La causale ${row.reason} non è tra quelle di Artigiani e Commercianti`);
    if (!/^\d{4}$/.test(row.officeCode ?? '')) errors.push('Serve il codice sede INPS (4 cifre) presso cui è aperta la posizione');
    // INPS sheet "F24 per artigiani e commercianti": "il codice INPS [...] (composto da 17 cifre)".
    if (!/^\d{17}$/.test(row.positionCode ?? '')) errors.push('Serve il codice INPS di 17 cifre della comunicazione INPS (cassetto previdenziale, "Dati del mod. F24")');
    if (row.entityCode) errors.push('Nella sezione INPS il codice ente resta vuoto');
    if (!MONTH_YEAR.test(row.periodFrom ?? '') || !MONTH_YEAR.test(row.periodTo ?? '')) errors.push('Periodo di riferimento da MM/AAAA a MM/AAAA');
    else if (periodValue(row.periodFrom!) > periodValue(row.periodTo!)) errors.push('L\'inizio del periodo non può essere dopo la fine');
    if (!(row.amount > 0)) errors.push('L\'importo deve essere maggiore di zero');
    const deduction = reason?.deduction ?? 'UNKNOWN';
    const who = reason && reason.artisans === row.reason ? 'INPS Artigiani' : 'INPS Commercianti';
    return { errors, deductibleAmount: deductible(deduction, row, errors), deduction, description: reason ? `${who} - ${reason.description}` : '' };
  },
};

const RULES: Partial<Record<ContributionSection, SectionRules>> = {
  INPS: selfEmployedRules,
  OTHER_ENTITY: otherEntityRules,
};

/** Checks a contribution row against the rules of its section and entity. */
export function checkContributionRow(row: ContributionRowInput): ContributionRowCheck {
  const rules = RULES[row.section];
  if (!rules) return { errors: [`Righe della sezione ${row.section} non ancora gestite`], deductibleAmount: 0, deduction: 'UNKNOWN', description: '' };
  return rules.check(row);
}
