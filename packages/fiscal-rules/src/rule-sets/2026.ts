import type { FiscalRuleSet } from '../rule-set.js';

/**
 * Fiscal rules for 2026 (payment year; Redditi PF 2026 return covers tax year 2025).
 * Every value is verified against an official source: see sourceRefs and
 * docs/normativa-2026.md. Must be explicitly activated by the platform admin.
 */

const ADE_PF1 =
  'https://www.agenziaentrate.gov.it/portale/documents/d/guest/pf1_istruzioni_2026_agg-28-05-2026';
const ADE_PF3 =
  'https://www.agenziaentrate.gov.it/portale/documents/d/guest/pf3_istruzioni_2026_agg-13-05-2026';
const NORM_L190 = 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2014-12-23;190~art1!vig=';
const GU_TU33 = 'https://www.gazzettaufficiale.it/eli/id/2025/03/26/25G00044/sg';
const GU_DL89 = 'https://www.gazzettaufficiale.it/eli/id/2026/05/22/26G00110/SG';
const INPS_C8 =
  'https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa/dettaglio.circolari-e-messaggi.2026.02.circolare-numero-8-del-03-02-2026_15153.html';
const NORM_L662 = 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1996-12-23;662~art1!vig=';
const ADE_STAMP =
  'https://www.agenziaentrate.gov.it/portale/documents/d/guest/l-imposta_di_bollo_sulle_fatture_elettronichegiugno2026';
const ADE_INPS_REASONS =
  'https://www.agenziaentrate.gov.it/portale/documents/20143/448438/Causali_INPS_02_07_2026.xls/96c9091f-6df9-60c6-c0e2-8fd5aef19fee';
const ADE_SPEC = 'https://www.agenziaentrate.gov.it/portale/documents/d/guest/allegato-a-specifiche-tecniche-vers-1-9-1';
const ADE_EINVOICE_GUIDE = 'https://www.agenziaentrate.gov.it/portale/documents/d/guest/guida_fattura_elettronica_dicembre_2025';
const NORM_DPR633_21 =
  'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:1972-10-26;633~art21!vig=';
const NORM_D462 = 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:1997-06-18;462~art2!vig=';
const NORM_D471 = 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:1997-12-18;471~art13!vig=';
const ADM_INTRASTAT =
  'https://www.adm.gov.it/portale/documents/20182/99139401/IL+SISTEMA+INTRASTAT_2023.pdf/363491a4-2a11-5ea2-10f8-383a44be0f9e';

const INPS_F24_SHEET =
  'https://www.inps.it/it/it/dettaglio-approfondimento.schede-informative.49920.F24-per-professionisti-iscritti-alla-Gestione-Separata.html';

const NORM_DPR435_17 = 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:2001-12-07;435~art17!vig=';
const NORM_DL193_7QUATER = 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legge:2016-10-22;193~art7quater!vig=';
const NORM_DL124_58 = 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legge:2019-10-26;124~art58!vig=';

const INPS_C14 =
  'https://www.inps.it/it/it/inps-comunica/atti/circolari-messaggi-e-normativa/dettaglio.circolari-e-messaggi.2026.02.circolare-numero-14-del-09-02-2026_15162.html';
const INPS_C35_2016 = 'https://servizi2.inps.it/servizi/Bussola/VisualizzaDoc.aspx?sVirtualURL=/Circolari/Circolare%20numero%2035%20del%2019-02-2016.htm';
const ADE_PF2 = 'https://www.agenziaentrate.gov.it/portale/documents/d/guest/pf2_istruzioni_2026_agg-13-05-2026';
const INPS_F24_SELF_EMPLOYED = 'https://www.inps.it/it/it/dettaglio-approfondimento.schede-informative.49923.f24-per-artigiani-e-commercianti.html';

const V = '2026-09-19';
/** Verification date of the INPS Artigiani and Commercianti section. */
const V_SELF_EMPLOYED = '2026-09-28';

export const ruleSet2026: FiscalRuleSet = {
  year: 2026,

  flatRate: {
    revenueThreshold: 85_000,
    immediateExitThreshold: 100_000,
    employeeCostThreshold: 20_000,
    employmentIncomeThreshold: 35_000,
    standardRatePct: 15,
    reducedRatePct: 5,
    reducedRateYears: 5,
    // Annex 4 L. 190/2014 (ATECO 2007), valid until the ATECO 2025 coefficients are approved (D.Lgs. 81/2025 art. 1).
    profitabilityByAteco: {
      '10': 40, '11': 40,
      '45': 40, '46': 40, '46.1': 62, '47': 40,
      '47.82': 54, '47.83': 54, '47.84': 54, '47.85': 54, '47.86': 54, '47.87': 54, '47.88': 54, '47.89': 54,
      '41': 86, '42': 86, '43': 86, '68': 86,
      '55': 40, '56': 40,
      '64': 78, '65': 78, '66': 78, '69': 78, '70': 78, '71': 78, '72': 78, '73': 78, '74': 78, '75': 78,
      '85': 78, '86': 78, '87': 78, '88': 78,
      '01': 67, '02': 67, '03': 67, '05': 67, '06': 67, '07': 67, '08': 67, '09': 67,
      '12': 67, '13': 67, '14': 67, '15': 67, '16': 67, '17': 67, '18': 67, '19': 67, '20': 67, '21': 67,
      '22': 67, '23': 67, '24': 67, '25': 67, '26': 67, '27': 67, '28': 67, '29': 67, '30': 67, '31': 67,
      '32': 67, '33': 67, '35': 67, '36': 67, '37': 67, '38': 67, '39': 67,
      '49': 67, '50': 67, '51': 67, '52': 67, '53': 67, '58': 67, '59': 67, '60': 67, '61': 67, '62': 67, '63': 67,
      '77': 67, '78': 67, '79': 67, '80': 67, '81': 67, '82': 67, '84': 67,
      '90': 67, '91': 67, '92': 67, '93': 67, '94': 67, '95': 67, '96': 67, '97': 67, '98': 67, '99': 67,
    },
  },

  advancePayment: {
    percentage: 100,
    notDueBelow: 51.65,
    singleIfFirstInstallmentAtMost: 103,
    firstInstallmentPct: 40,
    isaSubjectsFirstInstallmentPct: 50,
  },

  deadlines: {
    balanceAndFirstAdvance: '2026-06-30',
    balanceAndFirstAdvanceExtended: '2026-07-20',
    deferred: '2026-07-30',
    deferralSurchargePct: 0.4,
    deferredExtended: '2026-08-20',
    deferralSurchargeExtendedPct: 0.8,
    secondAdvance: '2026-11-30',
    taxReturnFiling: '2026-11-02',
    installmentDay: 16,
    installmentsEnd: { month: 12, day: 16 },
    augustDeferral: { month: 8, day: 20 },
  },

  installments: { annualInterestPct: 4, incrementPct: 0.33 },

  inps: {
    fullRatePct: 26.07,
    reducedRatePct: 24,
    incomeCeiling: 122_295,
    incomeFloor: 18_808,
    advancePct: 80,
    advanceInstallments: 2,
    surchargePct: 4,
  },

  inpsSelfEmployed: {
    incomeFloor: 18_808,
    higherRateThreshold: 56_224,
    incomeCeilingWithSeniority: 93_707,
    incomeCeiling: 122_295,
    artisansRatePct: 24,
    artisansHigherRatePct: 25,
    tradersRatePct: 24.48,
    tradersHigherRatePct: 25.48,
    maternityMonthly: 0.62,
    flatRateReductionPct: 35,
    fixedInstallmentDates: ['2026-05-18', '2026-08-20', '2026-11-16', '2027-02-16'],
    advancePct: 100,
    advanceInstallments: 2,
    artisansReasons: { fixed: 'AF', excess: 'AP', excessInstallments: 'APR', excessInterest: 'API' },
    tradersReasons: { fixed: 'CF', excess: 'CP', excessInstallments: 'CPR', excessInterest: 'CPI' },
  },

  stampDuty: {
    amount: 2,
    threshold: 77.47,
    deferralThreshold: 5_000,
    deadlines: [
      { quarter: 1, date: '2026-05-31', taxCode: '2521', listBChangesBy: '2026-04-30', amountAvailableOn: '2026-05-15' },
      { quarter: 2, date: '2026-09-30', taxCode: '2522', listBChangesBy: '2026-09-10', amountAvailableOn: '2026-09-20' },
      { quarter: 3, date: '2026-11-30', taxCode: '2523', listBChangesBy: '2026-10-31', amountAvailableOn: '2026-11-15' },
      { quarter: 4, date: '2027-02-28', taxCode: '2524', listBChangesBy: '2027-01-31', amountAvailableOn: '2027-02-15' },
    ],
  },

  taxCodes: {
    substituteTaxBalance: '1792',
    substituteTaxFirstAdvance: '1790',
    substituteTaxSecondAdvance: '1791',
    installmentInterest: '1668',
  },

  inpsReasons: { contribution: 'PXX', contributionReducedRate: 'P10', installments: 'PXXR', installmentsReducedRate: 'P10R', interest: 'DPPI' },

  eInvoice: {
    specVersion: '1.9.1',
    taxRegime: 'RF19',
    domesticNature: 'N2.2',
    foreignNature: 'N2.1',
    inpsFundType: 'TC22',
    regimeNote:
      "Operazione effettuata in regime forfettario ai sensi dell'articolo 1, commi da 54 a 89, della Legge n. 190/2014 e successive modificazioni",
    noWithholdingNote:
      "Operazione non soggetta a ritenuta alla fonte a titolo di acconto ai sensi dell'articolo 1, comma 67, Legge n. 190 del 2014 e successive modificazioni",
    euAnnotation: 'inversione contabile',
    nonEuAnnotation: 'operazione non soggetta',
    foreignRecipientCode: 'XXXXXXX',
    issueDays: 12,
    foreignIssueDayOfNextMonth: 15,
  },

  taxNotices: {
    paymentDays: 60,
    penaltyReduction: '1/3',
    maxQuarterlyInstallments: 20,
    summerSuspension: { from: { month: 8, day: 1 }, to: { month: 9, day: 4 } },
  },

  penalties: { latePaymentPct: 25, reductionWithin90Days: '1/2', reductionWithin15Days: '1/15 per day' },

  intrastat: { quarterlyServicesThreshold: 50_000, dueDay: 25 },

  sourceRefs: {
    'flatRate.revenueThreshold': { sourceId: 'normattiva-l-190-2014-art1', url: NORM_L190, title: 'L. 190/2014 art. 1 c. 54 lett. a)', quote: 'hanno conseguito ricavi ovvero hanno percepito compensi, ragguagliati ad anno, non superiori a euro 85.000', verifiedOn: V },
    'flatRate.immediateExitThreshold': { sourceId: 'normattiva-l-190-2014-art1', url: NORM_L190, title: 'L. 190/2014 art. 1 c. 71', quote: "Il regime forfetario cessa di avere applicazione dall'anno stesso in cui i ricavi o i compensi percepiti sono superiori a 100.000 euro", verifiedOn: V },
    'flatRate.employeeCostThreshold': { sourceId: 'normattiva-l-190-2014-art1', url: NORM_L190, title: 'L. 190/2014 art. 1 c. 54 lett. b)', quote: 'spese per un ammontare complessivamente non superiore ad euro 20.000 lordi', verifiedOn: V },
    'flatRate.employmentIncomeThreshold': { sourceId: 'ade-redditi-pf-2026-fasc3', url: ADE_PF3, title: 'Istr. Redditi PF 2026, Fasc. 3, quadro LM sez. III', quote: 'per gli anni 2025 e 2026, il predetto limite è elevato a 35.000 euro (art. 1, comma 27, legge 30 dicembre 2025, n. 199)', verifiedOn: V },
    'flatRate.standardRatePct': { sourceId: 'normattiva-l-190-2014-art1', url: NORM_L190, title: 'L. 190/2014 art. 1 c. 64', quote: 'imposta sostitutiva ... pari al 15 per cento', verifiedOn: V },
    'flatRate.reducedRatePct': { sourceId: 'normattiva-l-190-2014-art1', url: NORM_L190, title: 'L. 190/2014 art. 1 c. 65', quote: "per il periodo d'imposta in cui l'attività è iniziata e per i quattro successivi, l'aliquota ... è stabilita nella misura del 5 per cento", verifiedOn: V },
    'flatRate.reducedRateYears': { sourceId: 'normattiva-l-190-2014-art1', url: NORM_L190, title: 'L. 190/2014 art. 1 c. 65 (anno di inizio e i quattro successivi)', quote: 'per il periodo d\'imposta in cui l\'attività è iniziata e per i quattro successivi', verifiedOn: '2026-09-24' },
    'flatRate.profitabilityByAteco': { sourceId: 'ade-redditi-pf-2026-fasc3', url: ADE_PF3, title: 'Istr. Redditi PF 2026, Fasc. 3, tabella dei coefficienti di redditività; D.Lgs. 81/2025 art. 1', quote: 'Altre attività economiche ... (58-59-60-61-62-63) ... 67%', verifiedOn: V },
    'advancePayment': { sourceId: 'ade-redditi-pf-2026-fasc1', url: ADE_PF1, title: 'Istr. Redditi PF 2026, Fasc. 1, rigo RN62; D.Lgs. 33/2025 art. 72', quote: "in unica soluzione entro il 30 novembre 2026 se l'importo dovuto è inferiore ad euro 257,52 (il cui 40 per cento, infatti, è pari ad euro 103,00) ... la prima, nella misura del 40 per cento ... la seconda, nella restante misura del 60 per cento", verifiedOn: V },
    'advancePayment.percentage': { sourceId: 'gu-dlgs-33-2025-art72', url: GU_TU33, title: 'D.Lgs. 33/2025 art. 72 c. 1; Circ. AdE 10/E/2016 §4 (all\'imposta sostitutiva si applicano le regole IRPEF)', quote: 'devono versare, a titolo di acconto dell\'imposta dovuta per il periodo d\'imposta in corso, un importo pari al 100 per cento dell\'imposta relativa al periodo precedente', verifiedOn: '2026-09-24', additional: [{ sourceId: 'ade-circ-10e-2016', quote: 'Gli acconti ed il saldo dell\'imposta sostitutiva così determinata sono versati con le modalità ed entro i termini ordinari stabiliti per il versamento degli acconti e del saldo IRPEF' }] },
    'advancePayment.notDueBelow': { sourceId: 'ade-redditi-pf-2026-fasc1', url: ADE_PF1, title: 'Istr. Redditi PF 2026, Fasc. 1, rigo RN62 (la base LM42 è in euro interi: "inferiore a 52,00" e "inferiore a 51,65" danno lo stesso risultato)', quote: 'L\'acconto non deve essere versato se l\'importo indicato al rigo RN34, ovvero al rigo RN61, colonna 4, è inferiore ad euro 52,00. Pertanto, atteso che tutti gli importi indicati in dichiarazione sono espressi in unità di euro', verifiedOn: '2026-09-24' },
    'advancePayment.firstInstallmentPct': { sourceId: 'ade-redditi-pf-2026-fasc1', url: ADE_PF1, title: 'Istr. Redditi PF 2026, Fasc. 1, rigo RN62; DPR 435/2001 art. 17 c. 3', quote: 'il quaranta per cento dell\'acconto dovuto, ovvero il cinquanta per cento per i soggetti ISA, è versato alla scadenza della prima rata', verifiedOn: '2026-09-24' },
    'advancePayment.singleIfFirstInstallmentAtMost': { sourceId: 'normattiva-dpr-435-2001-art17', url: NORM_DPR435_17, title: 'DPR 435/2001 art. 17 c. 3', quote: 'sono effettuati in due rate salvo che il versamento da effettuare alla scadenza della prima rata non superi euro 103. Il quaranta per cento dell\'acconto dovuto è versato alla scadenza della prima rata e il residuo importo alla scadenza della seconda', verifiedOn: '2026-09-21' },
    'advancePayment.isaSubjectsFirstInstallmentPct': { sourceId: 'normattiva-dl-124-2019-art58', url: NORM_DL124_58, title: 'DL 124/2019 art. 58; Ris. AdE 93/E del 12/11/2019 (anche i forfettari e l\'imposta sostitutiva)', quote: 'sono effettuati, ai sensi dell\'articolo 17 del decreto del Presidente della Repubblica 7 dicembre 2001, n. 435, in due rate ciascuna nella misura del 50 per cento', verifiedOn: '2026-09-24', additional: [{ sourceId: 'ade-ris-93e-2019', quote: 'si applica anche ai contribuenti che: ... applicano il regime forfetario agevolato, previsto dall\'articolo 1, commi da 54 a 89, della legge 23 dicembre 2014, n. 190 ... all\'imposta sostitutiva delle imposte sui redditi e dell\'IRAP dovuta dai contribuenti che si avvalgono di forme di determinazione del reddito con criteri forfetari' }] },
    'deadlines.deferredExtended': { sourceId: 'ade-scadenzario-2026-08-20', url: 'https://www1.agenziaentrate.gov.it/servizi/scadenzario/main.php?op=3&entroil=20-08-2026&tipologia=a1&vista=0', title: 'Scadenzario AdE, scadenza del 20/08/2026; D.Lgs. 33/2025 art. 11 (il 30° giorno dopo il 20/07, il 19/08, cade tra l\'1 e il 20 agosto)', quote: 'Versamento in unica soluzione o come prima rata dell\'Irpef risultante dalle dichiarazioni annuali, a titolo di saldo per l\'anno 2025 e di primo acconto per l\'anno 2026, maggiorando le somme da versare dello 0,80% a titolo di interesse corrispettivo', verifiedOn: '2026-09-24' },
    'deadlines.balanceAndFirstAdvance': { sourceId: 'ade-redditi-pf-2026-fasc1', url: ADE_PF1, title: 'Istr. Redditi PF 2026, Fasc. 1, rigo RN62 e "Rateazione"', quote: 'la prima, nella misura del 40 per cento, entro il 30 giugno 2026 ... il soggetto che fruisce del differimento dal 30 giugno 2026 al 30 luglio 2026', verifiedOn: '2026-09-24' },
    'deadlines.deferralSurchargePct': { sourceId: 'ade-redditi-pf-2026-fasc1', url: ADE_PF1, title: 'Istr. Redditi PF 2026, Fasc. 1, "Rateazione"; DPR 435/2001 art. 17 c. 2', quote: 'devono preventivamente maggiorare le somme da versare dello 0,40 per cento a titolo di interesse corrispettivo', verifiedOn: '2026-09-24' },
    'deadlines.deferralSurchargeExtendedPct': { sourceId: 'gu-dl-89-2026-art6', url: GU_DL89, title: 'DL 22 maggio 2026 n. 89, art. 6', quote: 'entro il trentesimo giorno successivo al 20 luglio 2026, maggiorando le somme da versare dello 0,80 per cento', verifiedOn: '2026-09-24' },
    'deadlines.secondAdvance': { sourceId: 'ade-redditi-pf-2026-fasc1', url: ADE_PF1, title: 'Istr. Redditi PF 2026, Fasc. 1, rigo RN62', quote: 'la seconda, nella restante misura del 60 per cento entro 30 novembre 2026', verifiedOn: '2026-09-24' },
    'deadlines.installmentDay': { sourceId: 'gu-dlgs-33-2025-art10', url: GU_TU33, title: 'D.Lgs. 33/2025 art. 10 c. 4', quote: 'I versamenti rateali sono effettuati entro il giorno 16 di ciascun mese', verifiedOn: '2026-09-24' },
    'deadlines.balanceAndFirstAdvanceExtended': { sourceId: 'gu-dl-89-2026-art6', url: GU_DL89, title: 'DL 22 maggio 2026 n. 89, art. 6', quote: 'effettuano i predetti versamenti entro il 20 luglio 2026 senza alcuna maggiorazione, ovvero entro il trentesimo giorno successivo al 20 luglio 2026, maggiorando le somme da versare dello 0,80 per cento', verifiedOn: V },
    'deadlines.deferred': { sourceId: 'ade-redditi-pf-2026-fasc1', url: ADE_PF1, title: 'Istr. Redditi PF 2026, Fasc. 1, "Rateazione"; DPR 435/2001 art. 17 c. 2', quote: 'differimento dal 30 giugno 2026 al 30 luglio 2026 ... maggiorare preventivamente gli importi della misura dello 0,40 per cento', verifiedOn: V },
    'deadlines.taxReturnFiling': { sourceId: 'ade-redditi-pf-2026-fasc1', url: ADE_PF1, title: 'Istr. Redditi PF 2026, Fasc. 1, termini di presentazione', quote: 'dal 15 aprile 2026 al 2 novembre 2026 (dal momento che il 31 ottobre 2026 è sabato)', verifiedOn: V },
    'deadlines.installmentsEnd': { sourceId: 'gu-dlgs-33-2025-art10', url: GU_TU33, title: 'D.Lgs. 33/2025 art. 10 c. 1 e 4', quote: 'il pagamento deve essere completato entro il 16 dicembre ... I versamenti rateali sono effettuati entro il giorno 16 di ciascun mese', verifiedOn: V },
    'deadlines.augustDeferral': { sourceId: 'gu-dlgs-33-2025-art11', url: GU_TU33, title: 'D.Lgs. 33/2025 art. 11', quote: 'che hanno scadenza dal 1° al 20 agosto di ogni anno, possono essere effettuati entro il giorno 20 dello stesso mese, senza alcuna maggiorazione', verifiedOn: V },
    'installments': { sourceId: 'ade-redditi-pf-2026-fasc1', url: ADE_PF1, title: 'Istr. Redditi PF 2026, Fasc. 1, "Rateazione"', quote: "interessi nella misura del 4 per cento annuo, da calcolarsi secondo il metodo commerciale, tenendo conto del periodo decorrente dal giorno successivo a quello di scadenza della prima rata fino alla data di scadenza della seconda ... Sugli importi da versare con le rate mensili successive, si applicano gli interessi dello 0,33 per cento in misura forfetaria", verifiedOn: '2026-09-21' },
    'installments.annualInterestPct': { sourceId: 'gu-dm-2009-05-21-art5', url: 'https://www.gazzettaufficiale.it/atto/serie_generale/caricaDettaglioAtto/originario?atto.dataPubblicazioneGazzetta=2009-06-15&atto.codiceRedazionale=09A06833', title: 'DM 21 maggio 2009 art. 5', quote: 'Gli interessi per i pagamenti rateali ... sono dovuti nella misura del 4 per cento annuo', verifiedOn: '2026-09-21' },
    'inps.fullRatePct': { sourceId: 'inps-circ-8-2026', url: INPS_C8, title: 'Circ. INPS n. 8 del 3/2/2026, §2', quote: 'Soggetti non assicurati presso altra forma di previdenza obbligatoria 26,07% (25,00 IVS + 0,72 aliquota aggiuntiva + 0,35 ISCRO)', verifiedOn: V },
    'inps.reducedRatePct': { sourceId: 'inps-circ-8-2026', url: INPS_C8, title: 'Circ. INPS n. 8 del 3/2/2026, §2', quote: "pensionati o assicurati presso altre forme di previdenza obbligatorie ... l'aliquota è confermata al 24%", verifiedOn: V },
    'inps.incomeCeiling': { sourceId: 'inps-circ-8-2026', url: INPS_C8, title: 'Circ. INPS n. 8 del 3/2/2026, §6.1', quote: 'il massimale di reddito ... è pari a 122.295,00 euro', verifiedOn: V },
    'inps.incomeFloor': { sourceId: 'inps-circ-8-2026', url: INPS_C8, title: 'Circ. INPS n. 8 del 3/2/2026, §6.2', quote: 'il minimale di reddito ... è pari a 18.808,00 euro', verifiedOn: V },
    'inps.advancePct': { sourceId: 'normattiva-l-662-1996-art1', url: NORM_L662, title: 'L. 662/1996 art. 1 c. 212 lett. a) e b)', quote: 'un acconto del contributo dovuto, nella misura corrispondente al 40 per cento dell\'importo dovuto sui redditi di lavoro autonomo risultanti dalla dichiarazione dei redditi relativa all\'anno precedente', verifiedOn: V },
    'inps.advanceInstallments': { sourceId: 'inps-circ-8-2026', url: INPS_C8, title: 'Circ. INPS n. 8 del 3/2/2026, §4.2; L. 662/1996 art. 1 c. 212 lett. a) e b)', quote: 'alle scadenze fiscali fissate per il pagamento delle imposte sui redditi previste per l\'anno 2026 (saldo 2025, primo e secondo acconto 2026)', verifiedOn: '2026-09-24', additional: [{ sourceId: 'normattiva-l-662-1996-art1', quote: 'a) entro il 31 maggio di ciascun anno, un acconto del contributo dovuto ... b) entro il 30 novembre di ciascun anno, un acconto del contributo dovuto' }] },
    'inps.surchargePct': { sourceId: 'normattiva-l-662-1996-art1', url: NORM_L662, title: 'L. 662/1996 art. 1 c. 212', quote: 'hanno titolo ad addebitare ai committenti ... una percentuale nella misura del 4 per cento dei compensi lordi', verifiedOn: V },
    'inpsSelfEmployed.incomeFloor': { sourceId: 'inps-circ-14-2026', url: INPS_C14, title: 'Circ. INPS n. 14 del 9/2/2026, §2', quote: "il reddito minimo annuo da prendere in considerazione ai fini del calcolo del contributo IVS dovuto dagli artigiani e dagli esercenti attività commerciali è pari a 18.808,00 euro", verifiedOn: V_SELF_EMPLOYED },
    'inpsSelfEmployed.higherRateThreshold': { sourceId: 'inps-circ-14-2026', url: INPS_C14, title: 'Circ. INPS n. 14 del 9/2/2026, §3', quote: 'fino al limite della prima fascia di retribuzione annua pensionabile pari, per il corrente anno, all’importo di 56.224,00 euro. Per i redditi superiori a 56.224,00 euro annui resta confermato l’aumento dell’aliquota di un punto percentuale', verifiedOn: V_SELF_EMPLOYED },
    'inpsSelfEmployed.incomeCeilingWithSeniority': { sourceId: 'inps-circ-14-2026', url: INPS_C14, title: 'Circ. INPS n. 14 del 9/2/2026, §4', quote: "Per l'anno 2026, pertanto, il massimale di reddito annuo entro il quale sono dovuti i contributi IVS è pari a 93.707,00 euro", verifiedOn: V_SELF_EMPLOYED },
    'inpsSelfEmployed.incomeCeiling': { sourceId: 'inps-circ-14-2026', url: INPS_C14, title: 'Circ. INPS n. 14 del 9/2/2026, §4', quote: 'per i lavoratori privi di anzianità contributiva al 31 dicembre 1995, iscritti con decorrenza dal 1° gennaio 1996 o successiva, il massimale annuo è pari, per il 2026, a 122.295,00 euro', verifiedOn: V_SELF_EMPLOYED },
    'inpsSelfEmployed.artisansRatePct': { sourceId: 'inps-circ-14-2026', url: INPS_C14, title: 'Circ. INPS n. 14 del 9/2/2026, §3 (artigiani 24% e 25%, commercianti 24,48% e 25,48%)', quote: 'Scaglione di reddito Artigiani Commercianti Titolari e coadiuvanti/coadiutori fino a € 56.224,00 24% 24,48% superiore a € 56.224,00 25% 25,48%', verifiedOn: V_SELF_EMPLOYED },
    'inpsSelfEmployed.artisansHigherRatePct': { sourceId: 'inps-circ-14-2026', url: INPS_C14, title: 'Circ. INPS n. 14 del 9/2/2026, §3', quote: 'superiore a € 56.224,00 25% 25,48%', verifiedOn: V_SELF_EMPLOYED },
    'inpsSelfEmployed.tradersRatePct': { sourceId: 'inps-circ-14-2026', url: INPS_C14, title: 'Circ. INPS n. 14 del 9/2/2026, §3', quote: 'fino a € 56.224,00 24% 24,48%', verifiedOn: V_SELF_EMPLOYED },
    'inpsSelfEmployed.tradersHigherRatePct': { sourceId: 'inps-circ-14-2026', url: INPS_C14, title: 'Circ. INPS n. 14 del 9/2/2026, §3', quote: 'superiore a € 56.224,00 25% 25,48%', verifiedOn: V_SELF_EMPLOYED },
    'inpsSelfEmployed.maternityMonthly': { sourceId: 'inps-circ-14-2026', url: INPS_C14, title: 'Circ. INPS n. 14 del 9/2/2026, §1', quote: 'un contributo per le prestazioni di maternità stabilito, per gli iscritti alle Gestioni degli artigiani e dei commercianti, nella misura di 0,62 euro mensili', verifiedOn: V_SELF_EMPLOYED },
    'inpsSelfEmployed.flatRateReductionPct': { sourceId: 'normattiva-l-190-2014-art1', url: NORM_L190, title: 'L. 190/2014 art. 1 c. 77; Circ. INPS n. 35 del 19/2/2016 (riduzione sul minimale e sull\'eccedenza, maternità intera)', quote: 'Su tale reddito si applica la contribuzione dovuta ai fini previdenziali, ridotta del 35 per cento', verifiedOn: V_SELF_EMPLOYED, additional: [{ sourceId: 'inps-circ-35-2016', quote: 'la contribuzione dovuta, sia quella sul reddito entro il minimale, sia quella sul reddito eventualmente eccedente, viene ridotta del 35% ... Risulta in ogni caso dovuto il contributo di maternità, pari ad € 7,44 annui, da corrispondere alle scadenze previste per la contribuzione in misura fissa' }, { sourceId: 'inps-circ-14-2026', quote: 'Il regime in parola, che consiste nella riduzione contributiva del 35%, si applicherà nel 2026' }] },
    'inpsSelfEmployed.fixedInstallmentDates': { sourceId: 'inps-circ-14-2026', url: INPS_C14, title: 'Circ. INPS n. 14 del 9/2/2026, §9', quote: '18 maggio 2026, 20 agosto 2026, 16 novembre 2026 e 16 febbraio 2027, per il versamento delle quattro rate dei contributi dovuti sul minimale di reddito', verifiedOn: V_SELF_EMPLOYED },
    'inpsSelfEmployed.advancePct': { sourceId: 'ade-redditi-pf-2026-fasc2', url: ADE_PF2, title: 'Istr. Redditi PF 2026, Fasc. 2, "INPS - Modalità di calcolo degli acconti"', quote: 'il contribuente è tenuto al versamento di due acconti di pari importo, da effettuare alle medesime scadenze previste per gli acconti IRPEF relativi allo stesso anno d’imposta. Per l’individuazione dell’importo complessivo degli acconti dovuti è necessario determinare il reddito eccedente il minimale, con riferimento al reddito d’impresa dell’anno 2025, utilizzando i minimali e massimali previsti per l’anno 2026', verifiedOn: V_SELF_EMPLOYED, additional: [{ sourceId: 'inps-circ-14-2026', quote: 'a titolo di saldo 2025, primo acconto 2026 e secondo acconto 2026' }] },
    'inpsSelfEmployed.advanceInstallments': { sourceId: 'ade-redditi-pf-2026-fasc2', url: ADE_PF2, title: 'Istr. Redditi PF 2026, Fasc. 2, "INPS - Modalità di calcolo degli acconti"', quote: 'due acconti di pari importo', verifiedOn: V_SELF_EMPLOYED },
    'inpsSelfEmployed.artisansReasons': { sourceId: 'inps-scheda-f24-artigiani-commercianti', url: INPS_F24_SELF_EMPLOYED, title: 'INPS, "F24 per artigiani e commercianti"; AdE, tabella delle causali INPS (API e CPI dagli F24 reali: interessi della rateazione)', quote: 'Pagamento contributi dovuti sul minimale di reddito AF CF Pagamento contributi eccedenti il minimale di reddito (a debito) AP CP ... Pagamenti rateale dei contributi dovuti eccedenti il minimale APR CPR', verifiedOn: V_SELF_EMPLOYED, additional: [{ sourceId: 'ade-causali-inps-2026-07-02', quote: 'APR-API-CPI-CPR Artigiani e Commercianti - contributi extra minimale e correnti' }] },
    'inpsSelfEmployed.tradersReasons': { sourceId: 'inps-scheda-f24-artigiani-commercianti', url: INPS_F24_SELF_EMPLOYED, title: 'INPS, "F24 per artigiani e commercianti"; AdE, tabella delle causali INPS', quote: 'Pagamento contributi dovuti sul minimale di reddito AF CF Pagamento contributi eccedenti il minimale di reddito (a debito) AP CP ... Pagamenti rateale dei contributi dovuti eccedenti il minimale APR CPR', verifiedOn: V_SELF_EMPLOYED, additional: [{ sourceId: 'ade-causali-inps-2026-07-02', quote: 'APR-API-CPI-CPR Artigiani e Commercianti - contributi extra minimale e correnti' }] },
    'stampDuty': { sourceId: 'ade-guida-bollo-fe-2026-06', url: ADE_STAMP, title: 'Guida AdE "L\'imposta di bollo sulle fatture elettroniche", giugno 2026', quote: '1° TRIMESTRE 15 aprile 30 aprile 15 maggio 31 maggio (*) (**) 2° TRIMESTRE 15 luglio 10 settembre 20 settembre 30 settembre (**) 3° TRIMESTRE 15 ottobre 31 ottobre 15 novembre 30 novembre 4° TRIMESTRE ... 28 febbraio dell\'anno successivo (***) (*) Se l\'importo dovuto per il primo trimestre non supera 5.000 euro, il versamento può essere eseguito entro il 30 settembre. (**) Se l\'importo dovuto complessivamente per il primo e secondo trimestre non supera 5.000 euro, il versamento può essere eseguito entro il 30 novembre.', verifiedOn: V, additional: [{ sourceId: 'ade-ris-42e-2019', quote: '"2521" denominato "Imposta di bollo sulle fatture elettroniche – primo trimestre ... In sede di compilazione del modello "F24", i suddetti codici tributo sono esposti nella sezione "Erario", esclusivamente in corrispondenza delle somme indicate nella colonna "Importi a debito versati", con l\'indicazione nel campo "anno di riferimento" dell\'anno cui si riferisce il versamento, nel formato "AAAA".' }] },
    'stampDuty.amount': { sourceId: 'ade-guida-bollo-fe-2026-06', url: ADE_STAMP, title: 'Guida AdE "L\'imposta di bollo sulle fatture elettroniche", giugno 2026', quote: 'per ogni fattura emessa con indicazione dell\'assolvimento dell\'imposta di bollo, viene determinato un importo dovuto di 2 euro', verifiedOn: '2026-09-24' },
    'stampDuty.threshold': { sourceId: 'ade-guida-bollo-fe-2026-06', url: ADE_STAMP, title: 'Guida AdE "L\'imposta di bollo sulle fatture elettroniche", giugno 2026, criteri dell\'elenco B', quote: 'la somma degli importi delle operazioni presenti risulta maggiore di 77,47 euro', verifiedOn: '2026-09-24' },
    'taxCodes': { sourceId: 'ade-redditi-pf-2026-fasc1', url: ADE_PF1, title: 'Istr. Redditi PF 2026, Fasc. 1, principali codici tributo', quote: '1668: Interessi pagamento dilazionato ... 1792: Imposta sostitutiva regime fiscale forfetario – Saldo 1790: Imposta sostitutiva regime fiscale forfetario – Acconto prima rata 1791: Imposta sostitutiva regime fiscale forfetario – Acconto seconda rata o unica soluzione', verifiedOn: V },
    'inpsReasons': { sourceId: 'inps-scheda-f24-gestione-separata', url: INPS_F24_SHEET, title: 'INPS, "F24 per professionisti iscritti alla Gestione Separata" (agg. 8/7/2025)', quote: 'possono essere rateizzati (aggiungendo una “R” alla casuale contributi correnti P10 o PXX) ... Sia in caso di differimento che di rateizzazione, la maggiorazione per interessi deve essere esposta nel modello di pagamento separatamente dal contributo, utilizzando la causale contributo "DPPI" ... periodo di riferimento "da", inizio periodo cui si riferiscono i contributi (esempio 012025) ... periodo di riferimento "a", fine periodo cui si riferiscono i contributi (esempio 122025)', verifiedOn: '2026-09-21' },
    'inpsReasons.table': { sourceId: 'ade-causali-inps-2026-07-02', url: ADE_INPS_REASONS, title: 'Tabella delle causali INPS (AdE, 02/07/2026)', quote: 'DPPI Gestione 10% professionisti - Rate ed interessi ... P10-PXX Gestione Professionisti ... P10R-PXXR Gestione Professionisti - Rate e interessi', verifiedOn: '2026-09-20' },
    'eInvoice': { sourceId: 'ade-spec-fatturapa-1-9-1', url: ADE_SPEC, title: 'Specifiche tecniche FatturaPA v. 1.9.1 (dal 15/05/2026)', quote: 'RF19 Regime forfettario (art.1, c. 54-89, L. 190/2014) ... N2.1 non soggette ad IVA ai sensi degli artt. Da 7 a 7septies del DPR 633/72 ... N2.2 non soggette – altri casi ... <xs:enumeration value="TC22"> <xs:annotation> <xs:documentation>INPS</xs:documentation> ... ‘XXXXXXX’, in caso di fattura emessa verso soggetti non stabiliti in Italia', verifiedOn: '2026-09-20' },
    'eInvoice.specVersion': { sourceId: 'ade-spec-fatturapa-1-9-1', url: ADE_SPEC, title: 'Specifiche tecniche FatturaPA, Allegato A', quote: 'ALLEGATO A - SPECIFICHE TECNICHE Versione 1.9.1', verifiedOn: '2026-09-24' },
    'eInvoice.regimeNote': { sourceId: 'ade-guida-fe-2025-12', url: ADE_EINVOICE_GUIDE, title: 'Guida AdE fattura elettronica, dicembre 2025, "Fattura elettronica per i forfettari"', quote: 'dovrà ... valorizzarlo con la seguente dicitura: "Operazione effettuata in regime forfettario ai sensi dell\'articolo 1, commi da 54 a 89, della Legge n. 190/2014 e successive modificazioni"', verifiedOn: V },
    'eInvoice.noWithholdingNote': { sourceId: 'ade-guida-fe-2025-12', url: ADE_EINVOICE_GUIDE, title: 'Guida AdE fattura elettronica, dicembre 2025, "Fattura elettronica per i forfettari"', quote: 'Operazione non soggetta a ritenuta alla fonte a titolo di acconto ai sensi dell\'articolo 1, comma 67, Legge n. 190 del 2014 e successive modificazioni', verifiedOn: '2026-09-24' },
    'eInvoice.euAnnotation': { sourceId: 'normattiva-dpr-633-1972-art21', url: NORM_DPR633_21, title: 'DPR 633/72 art. 21 c. 6-bis', quote: "con l'annotazione «inversione contabile» ... con l'annotazione \"operazione non soggetta\"", verifiedOn: V },
    'eInvoice.nonEuAnnotation': { sourceId: 'normattiva-dpr-633-1972-art21', url: NORM_DPR633_21, title: 'DPR 633/72 art. 21 c. 6-bis lett. b)', quote: 'cessioni di beni e prestazioni di servizi che si considerano effettuate fuori dell\'Unione europea, con l\'annotazione "operazione non soggetta"', verifiedOn: '2026-09-24' },
    'eInvoice.issueDays': { sourceId: 'normattiva-dpr-633-1972-art21', url: NORM_DPR633_21, title: 'DPR 633/72 art. 21 c. 4 (primo periodo; lett. c e d)', quote: 'La fattura è emessa entro dodici giorni dall\'effettuazione dell\'operazione ... la fattura è emessa entro il giorno 15 del mese successivo a quello di effettuazione dell\'operazione', verifiedOn: V },
    'eInvoice.foreignIssueDayOfNextMonth': { sourceId: 'normattiva-dpr-633-1972-art21', url: NORM_DPR633_21, title: 'DPR 633/72 art. 21 c. 4 lett. c) e d)', quote: 'la fattura è emessa entro il giorno 15 del mese successivo a quello di effettuazione dell\'operazione', verifiedOn: '2026-09-24' },
    'taxNotices': { sourceId: 'normattiva-dlgs-462-1997-art2', url: NORM_D462, title: 'D.Lgs. 462/1997 art. 2 c. 2 e art. 3-bis', quote: "entro sessanta giorni dal ricevimento della comunicazione ... l'ammontare delle sanzioni amministrative dovute è ridotto ad un terzo", verifiedOn: '2026-09-20', additional: [{ sourceId: 'normattiva-dlgs-462-1997-art3bis', quote: 'possono essere versate in un numero massimo di venti rate trimestrali di pari importo' }] },
    'taxNotices.summerSuspension': { sourceId: 'normattiva-dl-193-2016-art7quater', url: NORM_DL193_7QUATER, title: 'DL 193/2016 art. 7-quater c. 17 (termini di pagamento del D.Lgs. 462/1997 art. 2 c. 2)', quote: 'Sono sospesi dal 1º agosto al 4 settembre i termini ... previsti dagli articoli 2, comma 2, e 3, comma 1, del decreto legislativo 18 dicembre 1997, n. 462', verifiedOn: '2026-09-24' },
    'penalties': { sourceId: 'normattiva-dlgs-471-1997-art13', url: NORM_D471, title: 'D.Lgs. 471/1997 art. 13 c. 1', quote: 'sanzione amministrativa pari al venticinque per cento di ogni importo non versato ... ritardo non superiore a novanta giorni, la sanzione ... è ridotta alla metà ... un quindicesimo per ciascun giorno di ritardo', verifiedOn: '2026-09-20' },
    'intrastat': { sourceId: 'adm-intrastat-2023', url: ADM_INTRASTAT, title: 'ADM, "Il sistema Intrastat" (2023) e Det. 493869/2021', quote: 'ammontare < 50.000 euro in tutti e 4 i trim prec: Modello Trimestrale con minor dettaglio Codice servizio ... entro il 25 del mese successivo al trimestre di riferimento', verifiedOn: '2026-09-20' },
  },
};
