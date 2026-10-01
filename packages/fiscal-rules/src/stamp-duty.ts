import type { FiscalRuleSet } from './rule-set.js';

/**
 * F24 row of the stamp duty on e-invoices for a quarter, when it is paid with F24 instead of the debit from the
 * "Fatture e corrispettivi" portal. Sources:
 * - AdE resolution 42/E of 9 April 2019 (ade-ris-42e-2019): codes 2521-2524 by quarter, "esposti nella sezione
 *   "Erario", esclusivamente in corrispondenza delle somme indicate nella colonna "Importi a debito versati", con
 *   l'indicazione nel campo "anno di riferimento" dell'anno cui si riferisce il versamento, nel formato "AAAA"";
 * - AdE stamp duty guide, June 2026 (ade-guida-bollo-fe-2026-06): the amount is the one the AdE computes from lists A
 *   and B; quarters paid later with the deferrals keep their own code ("sono quelli relativi ai trimestri per i quali
 *   l'imposta di bollo è dovuta"); a late payment also needs the penalty (2525) and interest (2526), not built here.
 */

export interface StampDutyF24Line {
  section: 'TREASURY';
  code: string;
  /** The year of the quarter. */
  referenceYear: number;
  debitAmount: number;
}

export function stampDutyF24Line(rules: FiscalRuleSet, quarter: number, amount: number): StampDutyF24Line {
  const deadline = rules.stampDuty.deadlines.find((d) => d.quarter === quarter);
  if (!deadline) throw new Error(`Il set di regole ${rules.year} non ha il codice tributo del bollo per il ${quarter}° trimestre`);
  if (!(amount > 0)) throw new Error("L'importo del bollo deve essere maggiore di zero");
  return { section: 'TREASURY', code: deadline.taxCode, referenceYear: rules.year, debitAmount: Math.round(amount * 100) / 100 };
}
