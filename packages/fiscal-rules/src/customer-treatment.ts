import type { FiscalRuleSet } from './rule-set.js';

/** Customer kinds (same values as the database enum). B2C = committente non soggetto passivo. */
export type CustomerKind = 'IT_B2B' | 'IT_B2C' | 'IT_PA' | 'EU' | 'EU_B2C' | 'NON_EU' | 'NON_EU_B2C';

export interface CustomerTreatment {
  /** Not established in Italy: CodiceDestinatario XXXXXXX, CAP 00000, no Provincia (AdE FAQ on foreign parties). */
  foreign: boolean;
  /** Natura of the lines: N2.1 outside the territorial scope, otherwise N2.2 of the flat-rate regime. */
  nature: 'N2.1' | 'N2.2';
  /** Annotation required by art. 21 par. 6-bis DPR 633/72, when the service is outside the territorial scope. */
  annotation?: string;
  /** "INVCONT" in AltriDatiGestionali on every line (EU taxable persons, AdE compilation guide v1.10). */
  reverseChargeLines: boolean;
  /** Counted for the Intrastat list of services rendered (EU taxable persons only, Circ. AdE 10/E/2016 §4.1.2). */
  intrastat: boolean;
  /** RiferimentoNormativo in DatiRiepilogo. */
  legalReference: string;
}

/**
 * Place of supply of services for a flat-rate professional, by customer:
 * - DPR 633/72 art. 7-ter par. 1 (Normattiva, text in force, checked 2026-09-24): services are made in
 *   Italy "a) … rese a soggetti passivi stabiliti nel territorio dello Stato" and "b) … rese a committenti
 *   non soggetti passivi da soggetti passivi stabiliti nel territorio dello Stato". Services to foreign
 *   taxable persons are therefore outside the scope (N2.1); services to private customers, EU or not,
 *   are made in Italy (N2.2 of the flat-rate regime, like an Italian private customer).
 * - Art. 7-septies: "In deroga a quanto stabilito dall'articolo 7-ter, comma 1, lettera b), non si
 *   considerano effettuate nel territorio dello Stato le seguenti prestazioni di servizi, quando sono rese
 *   a committenti non soggetti passivi domiciliati e residenti fuori della Comunità", e.g. lett. c)
 *   "prestazioni di consulenza e assistenza tecnica o legale nonché quelle di elaborazione e fornitura di
 *   dati e simili": for non-EU private customers receiving those services the operation is N2.1.
 * - Annotations: art. 21 par. 6-bis ("inversione contabile" for EU taxable persons, "operazione non
 *   soggetta" for operations outside the EU).
 * Electronic services to EU consumers (art. 7-octies) are not handled: see docs/compliance.md.
 */
export function customerTreatment(rules: FiscalRuleSet, kind: CustomerKind, art7SeptiesServices = false): CustomerTreatment {
  const domestic = { nature: 'N2.2' as const, reverseChargeLines: false, intrastat: false, legalReference: 'Art. 1, commi 54-89, L. 190/2014' };
  switch (kind) {
    case 'EU':
      return { foreign: true, nature: 'N2.1', annotation: rules.eInvoice.euAnnotation, reverseChargeLines: true, intrastat: true, legalReference: 'Art. 7-ter DPR 633/72' };
    case 'NON_EU':
      return { foreign: true, nature: 'N2.1', annotation: rules.eInvoice.nonEuAnnotation, reverseChargeLines: false, intrastat: false, legalReference: 'Art. 7-ter DPR 633/72' };
    case 'NON_EU_B2C':
      return art7SeptiesServices
        ? { foreign: true, nature: 'N2.1', annotation: rules.eInvoice.nonEuAnnotation, reverseChargeLines: false, intrastat: false, legalReference: 'Art. 7-septies DPR 633/72' }
        : { foreign: true, ...domestic };
    case 'EU_B2C':
      return { foreign: true, ...domestic };
    default:
      return { foreign: false, ...domestic };
  }
}
