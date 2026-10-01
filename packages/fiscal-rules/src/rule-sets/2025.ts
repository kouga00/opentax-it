import type { FiscalRuleSet } from '../rule-set.js';
import { ruleSet2026 } from './2026.js';

/**
 * Fiscal rules for 2025 (payment year; Redditi PF 2025 return covers tax year 2024).
 * Used as the income-year set for 2025 income (rates, coefficient, INPS rate and ceiling)
 * and as the payment-year set for what was paid in 2025. Derived from the 2026 set: only
 * the values that differ in 2025 are overridden, each with its own source below.
 * Must be explicitly activated by the platform admin.
 */

const INPS_C27 =
  'https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa/dettaglio.circolari-e-messaggi.2025.01.circolare-numero-27-del-30-01-2025_14807.html';
const NORM_DL84_13 = 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legge:2025-06-17;84~art13!vig=';
const NORM_DLGS1_8 = 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2024-01-08;1~art8!vig=';
const NORM_DL223_37 = 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legge:2006-07-04;223~art37!vig=';
const NORM_DPR322_2 =
  'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1998-07-22;322~art2!vig=';
const ADE_SPEC_19 = 'https://www.agenziaentrate.gov.it/portale/specifiche-tecniche-versione-1.9';
const NORM_DPR435_17 = 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:2001-12-07;435~art17!vig=';
const ADE_PF3_2026 = 'https://www.agenziaentrate.gov.it/portale/documents/d/guest/pf3_istruzioni_2026_agg-13-05-2026';

const INPS_C38 =
  'https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa/dettaglio.circolari-e-messaggi.2025.02.circolare-numero-38-del-07-02-2025_14820.html';

const V = '2026-09-21';

export const ruleSet2025: FiscalRuleSet = {
  ...ruleSet2026,
  year: 2025,

  deadlines: {
    balanceAndFirstAdvance: '2025-06-30',
    balanceAndFirstAdvanceExtended: '2025-07-21',
    deferred: '2025-07-30',
    deferralSurchargePct: 0.4,
    deferredExtended: '2025-08-20',
    deferralSurchargeExtendedPct: 0.4,
    secondAdvance: '2025-11-30',
    taxReturnFiling: '2025-10-31',
    installmentDay: 16,
    installmentsEnd: { month: 12, day: 16 },
    augustDeferral: { month: 8, day: 20 },
  },

  inps: {
    ...ruleSet2026.inps,
    fullRatePct: 26.07,
    reducedRatePct: 24,
    incomeCeiling: 120_607,
    incomeFloor: 18_555,
  },

  stampDuty: {
    ...ruleSet2026.stampDuty,
    deadlines: [
      { quarter: 1, date: '2025-05-31', taxCode: '2521', listBChangesBy: '2025-04-30', amountAvailableOn: '2025-05-15' },
      { quarter: 2, date: '2025-09-30', taxCode: '2522', listBChangesBy: '2025-09-10', amountAvailableOn: '2025-09-20' },
      { quarter: 3, date: '2025-11-30', taxCode: '2523', listBChangesBy: '2025-10-31', amountAvailableOn: '2025-11-15' },
      { quarter: 4, date: '2026-02-28', taxCode: '2524', listBChangesBy: '2026-01-31', amountAvailableOn: '2026-02-15' },
    ],
  },

  eInvoice: { ...ruleSet2026.eInvoice, specVersion: '1.9' },

  inpsSelfEmployed: {
    ...ruleSet2026.inpsSelfEmployed!,
    incomeFloor: 18_555,
    higherRateThreshold: 55_448,
    incomeCeilingWithSeniority: 92_413,
    incomeCeiling: 120_607,
    fixedInstallmentDates: ['2025-05-16', '2025-08-20', '2025-11-17', '2026-02-16'],
  },

  sourceRefs: {
    ...ruleSet2026.sourceRefs,
    'inpsSelfEmployed.incomeFloor': { sourceId: 'inps-circ-38-2025', url: INPS_C38, title: 'Circ. INPS n. 38 del 7/2/2025, §2', quote: "il reddito minimo annuo da prendere in considerazione ai fini del calcolo del contributo IVS dovuto dagli artigiani e dagli esercenti attività commerciali è pari a 18.555,00 euro", verifiedOn: '2026-09-28' },
    'inpsSelfEmployed.higherRateThreshold': { sourceId: 'inps-circ-38-2025', url: INPS_C38, title: 'Circ. INPS n. 38 del 7/2/2025, §3', quote: 'fino al limite della prima fascia di retribuzione annua pensionabile pari, per il corrente anno, all’importo di 55.448,00 euro', verifiedOn: '2026-09-28' },
    'inpsSelfEmployed.incomeCeilingWithSeniority': { sourceId: 'inps-circ-38-2025', url: INPS_C38, title: 'Circ. INPS n. 38 del 7/2/2025, §4', quote: "Per l'anno 2025, pertanto, il massimale di reddito annuo entro il quale sono dovuti i contributi IVS è pari a 92.413,00 euro", verifiedOn: '2026-09-28' },
    'inpsSelfEmployed.incomeCeiling': { sourceId: 'inps-circ-38-2025', url: INPS_C38, title: 'Circ. INPS n. 38 del 7/2/2025, §4', quote: 'il massimale annuo è pari, per il 2025, a 120.607,00 euro', verifiedOn: '2026-09-28' },
    'inpsSelfEmployed.fixedInstallmentDates': { sourceId: 'inps-circ-38-2025', url: INPS_C38, title: 'Circ. INPS n. 38 del 7/2/2025, §9', quote: '16 maggio 2025, 20 agosto 2025, 17 novembre 2025 e 16 febbraio 2026, per il versamento delle quattro rate dei contributi dovuti sul minimale di reddito', verifiedOn: '2026-09-28' },
    'flatRate.employmentIncomeThreshold': { sourceId: 'ade-redditi-pf-2026-fasc3', url: ADE_PF3_2026, title: 'Istr. Redditi PF 2026, Fasc. 3, quadro LM sez. III (redditi 2025)', quote: 'per gli anni 2025 e 2026, il predetto limite è elevato a 35.000 euro (art. 1, comma 27, legge 30 dicembre 2025, n. 199)', verifiedOn: V },
    'deadlines.deferredExtended': { sourceId: 'normattiva-dl-84-2025-art13', url: NORM_DL84_13, title: 'DL 17 giugno 2025 n. 84, art. 13 (il 30° giorno dopo il 21/07/2025 è il 20/08/2025)', quote: 'Per il 2025 è consentito effettuare i versamenti ... entro il trentesimo giorno successivo al 21 luglio 2025, maggiorando le somme da versare dello 0,40 per cento', verifiedOn: '2026-09-24' },
    'deadlines.balanceAndFirstAdvanceExtended': { sourceId: 'normattiva-dl-84-2025-art13', url: NORM_DL84_13, title: 'DL 17 giugno 2025 n. 84, art. 13', quote: 'effettuano i predetti versamenti entro il 21 luglio 2025 senza alcuna maggiorazione. Per il 2025 è consentito effettuare i versamenti ... entro il trentesimo giorno successivo al 21 luglio 2025, maggiorando le somme da versare dello 0,40 per cento ... nonché quelli che applicano il regime forfetario', verifiedOn: V },
    'deadlines.balanceAndFirstAdvance': { sourceId: 'normattiva-dpr-435-2001-art17', url: NORM_DPR435_17, title: 'DPR 435/2001 art. 17 c. 1 (30/06/2025)', quote: 'è effettuato entro il 30 giugno dell\'anno di presentazione della dichiarazione stessa', verifiedOn: '2026-09-24' },
    'deadlines.deferred': { sourceId: 'normattiva-dpr-435-2001-art17', url: NORM_DPR435_17, title: 'DPR 435/2001 art. 17 c. 2 (30° giorno dopo il 30/06/2025: 30/07/2025)', quote: 'possono essere effettuati entro il trentesimo giorno successivo ai termini ivi previsti, maggiorando le somme da versare dello 0,40 per cento a titolo di interesse corrispettivo', verifiedOn: '2026-09-24' },
    'deadlines.deferralSurchargePct': { sourceId: 'normattiva-dpr-435-2001-art17', url: NORM_DPR435_17, title: 'DPR 435/2001 art. 17 c. 2', quote: 'maggiorando le somme da versare dello 0,40 per cento a titolo di interesse corrispettivo', verifiedOn: '2026-09-24' },
    'deadlines.deferralSurchargeExtendedPct': { sourceId: 'normattiva-dl-84-2025-art13', url: NORM_DL84_13, title: 'DL 17 giugno 2025 n. 84, art. 13', quote: 'entro il trentesimo giorno successivo al 21 luglio 2025, maggiorando le somme da versare dello 0,40 per cento', verifiedOn: '2026-09-24' },
    'deadlines.secondAdvance': { sourceId: 'normattiva-dpr-435-2001-art17', url: NORM_DPR435_17, title: 'DPR 435/2001 art. 17 c. 3 lett. b) (novembre: 30/11/2025)', quote: 'per la seconda rata, nel mese di novembre', verifiedOn: '2026-09-24' },
    'deadlines.installmentsEnd': { sourceId: 'normattiva-dlgs-1-2024-art8', url: NORM_DLGS1_8, title: 'D.Lgs. 1/2024 art. 8 (art. 20 D.Lgs. 241/97 come modificato, dal saldo 2023)', quote: 'le parole: «mese di novembre» sono sostituite dalle seguenti: «16 dicembre» ... «4. I versamenti rateali sono effettuati entro il giorno 16 di ciascun mese.»', verifiedOn: V },
    'deadlines.augustDeferral': { sourceId: 'normattiva-dl-223-2006-art37', url: NORM_DL223_37, title: 'DL 223/2006 art. 37 c. 11-bis (in vigore nel 2025)', quote: 'che hanno scadenza dal 1º al 20 agosto di ogni anno, possono essere effettuati entro il giorno 20 dello stesso mese, senza alcuna maggiorazione', verifiedOn: V },
    'deadlines.taxReturnFiling': { sourceId: 'normattiva-dpr-322-1998-art2', url: NORM_DPR322_2, title: 'DPR 322/1998 art. 2 c. 1 (31 ottobre; nel 2025 è venerdì)', quote: 'in via telematica tra il 15 aprile e il 31 ottobre dell\'anno successivo a quello di chiusura del periodo di imposta', verifiedOn: V },
    'inps.fullRatePct': { sourceId: 'inps-circ-27-2025', url: INPS_C27, title: 'Circ. INPS n. 27 del 30/01/2025, §2 e §4', quote: 'Soggetti non assicurati presso altra forma di previdenza obbligatoria 26,07%', verifiedOn: V },
    'inps.reducedRatePct': { sourceId: 'inps-circ-27-2025', url: INPS_C27, title: 'Circ. INPS n. 27 del 30/01/2025, §2', quote: "l'anno 2025, l'aliquota è confermata al 24%", verifiedOn: V },
    'inps.incomeCeiling': { sourceId: 'inps-circ-27-2025', url: INPS_C27, title: 'Circ. INPS n. 27 del 30/01/2025, §6.1', quote: 'Per l\'anno 2025 il massimale di reddito ... è pari a 120.607,00 euro', verifiedOn: V },
    'inps.incomeFloor': { sourceId: 'inps-circ-27-2025', url: INPS_C27, title: 'Circ. INPS n. 27 del 30/01/2025, §6.2', quote: 'Per l\'anno 2025 il minimale di reddito ... è pari a 18.555,00 euro', verifiedOn: V },
    'inps.advanceInstallments': { sourceId: 'inps-circ-27-2025', url: INPS_C27, title: 'Circ. INPS n. 27 del 30/01/2025, §4.2', quote: 'alle scadenze fiscali previste per il pagamento delle imposte sui redditi (saldo 2024, primo e secondo acconto 2025)', verifiedOn: '2026-09-24' },
    'inps.advanceRateYear': { sourceId: 'inps-circ-27-2025', url: INPS_C27, title: 'Circ. INPS n. 27 del 30/01/2025, §4.2', quote: "l'acconto per l'anno di imposta 2025 deve essere calcolato applicando le aliquote in vigore per l'anno 2025", verifiedOn: V },
    'stampDuty': { sourceId: 'ade-guida-bollo-fe-2026-06', url: ruleSet2026.sourceRefs['stampDuty'].url, title: 'DM 17/06/2014 art. 6 c. 2 (tabella delle scadenze nella guida AdE sul bollo, giugno 2026): ultimo giorno del secondo mese dopo il trimestre, 3° trimestre entro il 30 novembre', quote: ruleSet2026.sourceRefs['stampDuty'].quote, verifiedOn: V, additional: [{ sourceId: 'ade-ris-42e-2019', quote: '"2521" denominato "Imposta di bollo sulle fatture elettroniche – primo trimestre ... In sede di compilazione del modello "F24", i suddetti codici tributo sono esposti nella sezione "Erario", esclusivamente in corrispondenza delle somme indicate nella colonna "Importi a debito versati", con l\'indicazione nel campo "anno di riferimento" dell\'anno cui si riferisce il versamento, nel formato "AAAA".' }] },
    'eInvoice.specVersion': { sourceId: 'ade-spec-fatturapa-1-9-pagina', url: ADE_SPEC_19, title: 'AdE, specifiche tecniche v. 1.9 (utilizzabili dal 1° aprile 2025)', quote: 'Specifiche tecniche versione 1.9 ... Documentazione utilizzabile dal 1° aprile 2025', verifiedOn: V },
  },
};
