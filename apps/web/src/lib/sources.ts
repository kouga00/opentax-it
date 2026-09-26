import { formatDate } from './format';
import type { SourceKind } from './types';

export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  law: 'Norma',
  circular: 'Circolare',
  resolution: 'Risoluzione',
  instructions: 'Istruzioni',
  specification: 'Specifiche tecniche',
  guide: 'Guida',
  table: 'Tabella',
  'web-page': 'Pagina web',
};

/** Italian names of the rule set entries (fields or sections) cited in `sourceRefs`. */
export const RULE_LABELS: Record<string, string> = {
  'flatRate.revenueThreshold': 'Soglia di ricavi per il regime forfettario',
  'flatRate.immediateExitThreshold': 'Soglia di uscita immediata dal regime',
  'flatRate.employeeCostThreshold': 'Limite delle spese per lavoro dipendente',
  'flatRate.employmentIncomeThreshold': 'Limite dei redditi da lavoro dipendente',
  'flatRate.standardRatePct': 'Aliquota dell\'imposta sostitutiva',
  'flatRate.reducedRatePct': 'Aliquota ridotta per le nuove attività',
  'flatRate.reducedRateYears': 'Anni di aliquota ridotta',
  'flatRate.profitabilityByAteco': 'Coefficienti di redditività per codice ATECO',
  advancePayment: 'Acconti dell\'imposta sostitutiva',
  'advancePayment.percentage': 'Misura dell\'acconto',
  'advancePayment.notDueBelow': 'Acconto non dovuto sotto',
  'advancePayment.firstInstallmentPct': 'Prima rata dell\'acconto',
  'advancePayment.singleIfFirstInstallmentAtMost': 'Acconto in unica soluzione se la prima rata non supera',
  'advancePayment.isaSubjectsFirstInstallmentPct': 'Prima rata dell\'acconto per i soggetti ISA',
  'deadlines.balanceAndFirstAdvance': 'Scadenza di saldo e primo acconto',
  'deadlines.balanceAndFirstAdvanceExtended': 'Scadenza prorogata di saldo e primo acconto',
  'deadlines.deferred': 'Scadenza differita di 30 giorni',
  'deadlines.deferralSurchargePct': 'Maggiorazione per il differimento',
  'deadlines.deferredExtended': 'Scadenza differita dopo la proroga',
  'deadlines.deferralSurchargeExtendedPct': 'Maggiorazione per il differimento dopo la proroga',
  'deadlines.secondAdvance': 'Scadenza del secondo acconto',
  'deadlines.taxReturnFiling': 'Termine di presentazione della dichiarazione',
  'deadlines.installmentDay': 'Giorno di scadenza delle rate',
  'deadlines.installmentsEnd': 'Ultima rata entro',
  'deadlines.augustDeferral': 'Scadenze di agosto spostate al',
  installments: 'Interessi di rateazione',
  'installments.annualInterestPct': 'Tasso annuo degli interessi di rateazione',
  'installments.incrementPct': 'Interessi forfettari per ogni rata successiva alla seconda',
  'inps.fullRatePct': 'Aliquota INPS Gestione separata',
  'inps.reducedRatePct': 'Aliquota INPS ridotta (pensionati o altra previdenza)',
  'inps.incomeCeiling': 'Massimale di reddito INPS',
  'inps.incomeFloor': 'Minimale di reddito INPS',
  'inps.advancePct': 'Misura di ciascun acconto INPS',
  'inps.advanceInstallments': 'Numero di acconti INPS',
  'inps.surchargePct': 'Rivalsa INPS in fattura',
  'inps.advanceRateYear': 'Aliquote dell\'anno per l\'acconto INPS',
  stampDuty: 'Scadenze e differimenti dell\'imposta di bollo',
  'stampDuty.amount': 'Importo dell\'imposta di bollo',
  'stampDuty.threshold': 'Soglia dell\'imposta di bollo',
  'stampDuty.deferralThreshold': 'Soglia per rinviare il versamento del bollo',
  'stampDuty.deadlines': 'Scadenze trimestrali e codici tributo del bollo',
  taxCodes: 'Codici tributo',
  'taxCodes.substituteTaxBalance': 'Codice tributo del saldo',
  'taxCodes.substituteTaxFirstAdvance': 'Codice tributo del primo acconto',
  'taxCodes.substituteTaxSecondAdvance': 'Codice tributo del secondo acconto',
  'taxCodes.installmentInterest': 'Codice tributo degli interessi di rateazione',
  inpsReasons: 'Causali INPS e periodo di riferimento',
  'inpsReasons.table': 'Tabella delle causali INPS',
  'inpsReasons.contribution': 'Causale del contributo',
  'inpsReasons.contributionReducedRate': 'Causale del contributo ad aliquota ridotta',
  'inpsReasons.installments': 'Causale del contributo rateizzato',
  'inpsReasons.installmentsReducedRate': 'Causale del contributo rateizzato ad aliquota ridotta',
  'inpsReasons.interest': 'Causale degli interessi e della maggiorazione',
  eInvoice: 'Codici della fattura elettronica',
  'eInvoice.specVersion': 'Versione delle specifiche FatturaPA',
  'eInvoice.taxRegime': 'Regime fiscale in fattura',
  'eInvoice.domesticNature': 'Natura IVA per i clienti italiani',
  'eInvoice.foreignNature': 'Natura IVA per i clienti esteri',
  'eInvoice.inpsFundType': 'Tipo cassa per la rivalsa INPS',
  'eInvoice.foreignRecipientCode': 'Codice destinatario per i clienti esteri',
  'eInvoice.regimeNote': 'Dicitura del regime forfettario',
  'eInvoice.noWithholdingNote': 'Dicitura di esclusione dalla ritenuta',
  'eInvoice.euAnnotation': 'Annotazione per i clienti UE',
  'eInvoice.nonEuAnnotation': 'Annotazione per i clienti extra UE',
  'eInvoice.issueDays': 'Termine di emissione della fattura',
  'eInvoice.foreignIssueDayOfNextMonth': 'Termine di emissione per i clienti esteri',
  taxNotices: 'Avvisi bonari',
  'taxNotices.paymentDays': 'Termine di pagamento dell\'avviso bonario',
  'taxNotices.penaltyReduction': 'Riduzione della sanzione',
  'taxNotices.maxQuarterlyInstallments': 'Numero massimo di rate trimestrali',
  'taxNotices.summerSuspension': 'Sospensione estiva degli avvisi bonari',
  penalties: 'Sanzioni per omesso versamento',
  'penalties.latePaymentPct': 'Sanzione per omesso versamento',
  'penalties.reductionWithin90Days': 'Riduzione con ritardo fino a 90 giorni',
  'penalties.reductionWithin15Days': 'Riduzione con ritardo fino a 15 giorni',
  intrastat: 'Elenchi Intrastat dei servizi',
  'intrastat.quarterlyServicesThreshold': 'Soglia per gli elenchi trimestrali dei servizi',
  'intrastat.dueDay': 'Giorno di presentazione degli elenchi',
};

const LABEL_ORDER = new Map(Object.keys(RULE_LABELS).map((k, i) => [k, i]));

/** Sorts rule set paths in the order of RULE_LABELS (the database does not keep the key order). */
export function byRuleOrder(a: string, b: string): number {
  return (LABEL_ORDER.get(a) ?? Infinity) - (LABEL_ORDER.get(b) ?? Infinity) || a.localeCompare(b);
}

/** Section of a rule set path: "deadlines.secondAdvance" → "deadlines". */
export const ruleSection = (path: string) => path.split('.')[0];

/** Link to a rule inside the rules page: the section is chosen in the page, the hash scrolls to the rule. */
export function ruleHref(year: number, path: string, setId?: string): string {
  return `/rules?year=${year}${setId ? `&set=${setId}` : ''}&section=${ruleSection(path)}#${path}`;
}

/** Sections of a rule set, in the order shown. */
export const RULE_SECTIONS: Array<{ key: string; label: string }> = [
  { key: 'flatRate', label: 'Regime forfettario' },
  { key: 'advancePayment', label: 'Acconti dell\'imposta sostitutiva' },
  { key: 'deadlines', label: 'Scadenze' },
  { key: 'installments', label: 'Rateazione' },
  { key: 'inps', label: 'INPS Gestione separata' },
  { key: 'stampDuty', label: 'Imposta di bollo' },
  { key: 'taxCodes', label: 'Codici tributo' },
  { key: 'inpsReasons', label: 'Causali INPS' },
  { key: 'eInvoice', label: 'Fattura elettronica' },
  { key: 'taxNotices', label: 'Avvisi bonari' },
  { key: 'penalties', label: 'Sanzioni' },
  { key: 'intrastat', label: 'Intrastat' },
];

/** Unit words for plain numbers that are not amounts or percentages. */
const NUMBER_FORMATS: Record<string, (n: string) => string> = {
  'advancePayment.percentage': (n) => `${n}%`,
  'flatRate.reducedRateYears': (n) => `${n} anni`,
  'deadlines.installmentDay': (n) => `giorno ${n}`,
  'eInvoice.issueDays': (n) => `${n} giorni`,
  'eInvoice.foreignIssueDayOfNextMonth': (n) => `giorno ${n} del mese successivo`,
  'taxNotices.paymentDays': (n) => `${n} giorni`,
  'intrastat.dueDay': (n) => `giorno ${n} del mese successivo`,
};

/** Values stored as codes in English, shown in Italian. */
const STRING_VALUES: Record<string, string> = { '1/15 per day': '1/15 per ogni giorno di ritardo' };

const isMonthDay = (v: unknown): v is { month: number; day: number } =>
  !!v && typeof v === 'object' && Object.keys(v).length === 2 && 'month' in v && 'day' in v;

/** A rule set value as text; null for sections and tables, which have no single value. */
export function ruleValueLabel(key: string, value: unknown): string | null {
  if (typeof value === 'string') return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDate(value) : (STRING_VALUES[value] ?? value);
  if (typeof value === 'number') {
    const n = value.toLocaleString('it-IT');
    if (/Pct$/.test(key)) return `${n}%`;
    if (/Threshold$|Ceiling$|Floor$|notDueBelow|AtMost$|\.amount$|\.threshold$/.test(key)) return `${value.toLocaleString('it-IT', { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, useGrouping: 'always' })} €`;
    return NUMBER_FORMATS[key]?.(n) ?? n;
  }
  if (isMonthDay(value)) return `${String(value.day).padStart(2, '0')}/${String(value.month).padStart(2, '0')}`;
  if (value && typeof value === 'object' && 'from' in value && 'to' in value && isMonthDay(value.from) && isMonthDay(value.to)) {
    return `dal ${ruleValueLabel('', value.from)} al ${ruleValueLabel('', value.to)}`;
  }
  if (Array.isArray(value) && value.every((d) => d && typeof d === 'object' && 'quarter' in d && 'date' in d)) {
    return value.map((d: { quarter: number; date: string; taxCode?: string }) => `${d.quarter}° trim. ${formatDate(d.date)}${d.taxCode ? ` (${d.taxCode})` : ''}`).join(' · ');
  }
  return null;
}
