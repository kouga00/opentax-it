import { z } from 'zod';

/**
 * FiscalRuleSet schema: every value that changes (or may change) from year to year.
 * The calculation engine contains no numbers: it reads them from here.
 * Each value has an entry in `sourceRefs` with the official URL and a quotation.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'ISO date YYYY-MM-DD');
const monthDay = z.object({ month: z.number().int().min(1).max(12), day: z.number().int().min(1).max(31) });
const pct = z.number().min(0).max(100);

export const SourceRefSchema = z.object({
  url: z.string().url(),
  /** Reference shown to the user, in Italian (e.g. "Circ. INPS n. 8 del 3/2/2026, §2"). */
  title: z.string(),
  /** Verbatim excerpt of the archived source; fragments separated by "...". */
  quote: z.string(),
  verifiedOn: isoDate,
  /** Id in docs/fonti/registro.json. Optional so that rule sets stored before the registry still parse. */
  sourceId: z.string().optional(),
  /** Further sources the value rests on, each with its own verbatim quote. */
  additional: z.array(z.object({ sourceId: z.string(), quote: z.string() })).optional(),
});

export const FiscalRuleSetSchema = z.object({
  year: z.number().int().min(2015),

  /** Flat-rate regime ("regime forfettario"): L. 190/2014 art. 1 par. 54-89. */
  flatRate: z.object({
    revenueThreshold: z.number(), // par. 54 lett. a)
    immediateExitThreshold: z.number(), // par. 71
    employeeCostThreshold: z.number(), // par. 54 lett. b)
    employmentIncomeThreshold: z.number(), // par. 57 lett. d-ter)
    standardRatePct: pct, // par. 64 (imposta sostitutiva)
    reducedRatePct: pct, // par. 65
    reducedRateYears: z.number().int(), // start year + 4
    /** Profitability coefficient ("coefficiente di redditività") by ATECO 2007 prefix; longest prefix wins. */
    profitabilityByAteco: z.record(z.string(), pct),
  }),

  /**
   * Advance payments ("acconti"): art. 72 D.Lgs. 33/2025; DPR 435/2001 art. 17 par. 3 (two
   * installments unless the first is at most EUR 103; 40% first); DL 124/2019 art. 58 (50% + 50%
   * for taxpayers with an ISA-approved activity, extended to the flat-rate substitute tax by
   * AdE resolution 93/E/2019). Also apply to the substitute tax (L. 190 par. 64).
   */
  advancePayment: z.object({
    percentage: pct,
    notDueBelow: z.number(),
    /** Single payment in November when the first installment would not exceed this amount. */
    singleIfFirstInstallmentAtMost: z.number(),
    firstInstallmentPct: pct,
    isaSubjectsFirstInstallmentPct: pct,
  }),

  /** Payment deadlines of the year (year in which the tax return is filed). */
  deadlines: z.object({
    balanceAndFirstAdvance: isoDate,
    /** Yearly extension, if any (e.g. DL 89/2026 art. 6). When present it overrides balanceAndFirstAdvance for eligible taxpayers. */
    balanceAndFirstAdvanceExtended: isoDate.optional(),
    /** 30-day deferral with surcharge (art. 17 par. 2 DPR 435/2001). */
    deferred: isoDate,
    deferralSurchargePct: z.number(),
    deferredExtended: isoDate.optional(),
    deferralSurchargeExtendedPct: z.number().optional(),
    secondAdvance: isoDate,
    taxReturnFiling: isoDate,
    /** Art. 10 D.Lgs. 33/2025: installments by the 16th of each month, ending 16 December. */
    installmentDay: z.number().int(),
    installmentsEnd: monthDay,
    /** Art. 11 D.Lgs. 33/2025: 1-20 August → 20 August. */
    augustDeferral: monthDay,
  }),

  /**
   * Installment interest: annual rate (DM 21/05/2009 art. 5), applied with the commercial
   * method to the second installment; forfait increment on each following one (Redditi PF instructions).
   */
  installments: z.object({
    annualInterestPct: z.number(),
    incrementPct: z.number(),
  }),

  /** INPS "Gestione Separata" for professionals (yearly INPS circular; L. 662/96 par. 212). */
  inps: z.object({
    fullRatePct: z.number(),
    reducedRatePct: z.number(),
    incomeCeiling: z.number(), // massimale
    incomeFloor: z.number(), // minimale
    advancePct: pct,
    advanceInstallments: z.number().int(),
    surchargePct: z.number(), // rivalsa 4%
  }),

  /**
   * INPS Artigiani and Commercianti (yearly INPS circular; L. 233/1990; flat-rate reduction L. 190/2014 par. 77).
   * Optional: rule sets stored before this section existed still parse, and the scheme is then not computed.
   */
  inpsSelfEmployed: z
    .object({
      /** Minimum income ("minimale"): the fixed contribution is due on it. */
      incomeFloor: z.number(),
      /** First band limit: above it the rate rises by one point. */
      higherRateThreshold: z.number(),
      /** Ceiling for those with contributions before 1996 ("anzianità contributiva al 31 dicembre 1995"). */
      incomeCeilingWithSeniority: z.number(),
      /** Ceiling for those enrolled from 1996 (L. 335/1995 art. 2 par. 18). */
      incomeCeiling: z.number(),
      artisansRatePct: pct,
      artisansHigherRatePct: pct,
      tradersRatePct: pct,
      tradersHigherRatePct: pct,
      /** Maternity contribution per month (not reduced for the flat-rate regime). */
      maternityMonthly: z.number(),
      /** Flat-rate regime reduction, on request (L. 190/2014 par. 77 and 83). */
      flatRateReductionPct: pct,
      /** The four installments of the contribution on the minimum income. */
      fixedInstallmentDates: z.array(isoDate).length(4),
      /** Advances on the income above the minimum: share of the contribution computed on the previous year's income, split in equal parts. */
      advancePct: pct,
      advanceInstallments: z.number().int(),
      /** F24 INPS reasons: fixed contribution, above-minimum contribution, its installments and their interest. */
      artisansReasons: z.object({ fixed: z.string(), excess: z.string(), excessInstallments: z.string(), excessInterest: z.string() }),
      tradersReasons: z.object({ fixed: z.string(), excess: z.string(), excessInstallments: z.string(), excessInterest: z.string() }),
    })
    .optional(),

  /** Stamp duty ("imposta di bollo") on e-invoices (DM 17/06/2014; AdE guide). */
  stampDuty: z.object({
    amount: z.number(),
    threshold: z.number(),
    deferralThreshold: z.number(),
    deadlines: z.array(
      z.object({
        quarter: z.number().int().min(1).max(4),
        /** Payment deadline. */
        date: isoDate,
        taxCode: z.string(),
        /** Last day to change list B on the "Fatture e corrispettivi" portal; optional, so older stored sets still parse. */
        listBChangesBy: isoDate.optional(),
        /** Day by which the AdE shows the amount due on the portal. */
        amountAvailableOn: isoDate.optional(),
      }),
    ),
  }),

  /** F24 tax codes ("codici tributo"). */
  taxCodes: z.object({
    substituteTaxBalance: z.string(),
    substituteTaxFirstAdvance: z.string(),
    substituteTaxSecondAdvance: z.string(),
    installmentInterest: z.string(),
  }),

  /**
   * F24 INPS contribution reasons ("causali contributo") for Gestione Separata professionals
   * (INPS sheet "F24 per professionisti iscritti alla Gestione Separata", updated 8/7/2025):
   * single payment PXX (24% rate: P10), installments PXXR (P10R), deferral/installment interest DPPI.
   */
  inpsReasons: z.object({
    contribution: z.string(),
    contributionReducedRate: z.string(),
    installments: z.string(),
    installmentsReducedRate: z.string(),
    interest: z.string(),
  }),

  eInvoice: z.object({
    specVersion: z.string(),
    taxRegime: z.string(), // RegimeFiscale
    domesticNature: z.string(), // Natura for domestic operations
    foreignNature: z.string(), // Natura for art. 7-ter operations
    inpsFundType: z.string(), // TipoCassa
    regimeNote: z.string(), // Causale: flat-rate regime
    noWithholdingNote: z.string(), // Causale: no withholding tax
    euAnnotation: z.string(), // art. 21 par. 6-bis lett. a)
    nonEuAnnotation: z.string(), // art. 21 par. 6-bis lett. b)
    foreignRecipientCode: z.string(), // CodiceDestinatario
    issueDays: z.number().int(),
    /** Art. 7-ter services to EU/non-EU taxable persons: by the 15th of the following month (art. 21 par. 4 lett. c-d). */
    foreignIssueDayOfNextMonth: z.number().int(),
  }),

  /** Automated-control notices ("avvisi bonari"): D.Lgs. 462/97. */
  taxNotices: z.object({
    paymentDays: z.number().int(),
    penaltyReduction: z.string(),
    maxQuarterlyInstallments: z.number().int(),
    summerSuspension: z.object({ from: monthDay, to: monthDay }),
  }),

  penalties: z.object({
    latePaymentPct: z.number(),
    reductionWithin90Days: z.string(),
    reductionWithin15Days: z.string(),
  }),

  intrastat: z.object({
    quarterlyServicesThreshold: z.number(),
    dueDay: z.number().int(),
  }),

  /** Key = field path (e.g. "inps.fullRatePct"). */
  sourceRefs: z.record(z.string(), SourceRefSchema),
});

export type FiscalRuleSet = z.infer<typeof FiscalRuleSetSchema>;
export type SourceRef = z.infer<typeof SourceRefSchema>;

export function parseFiscalRuleSet(input: unknown): FiscalRuleSet {
  return FiscalRuleSetSchema.parse(input);
}

/** Profitability coefficient for an ATECO 2007 code (longest prefix match). */
export function profitabilityCoefficient(rules: FiscalRuleSet, ateco: string): number {
  const code = ateco.replace(/\./g, '');
  let best: { len: number; value: number } | undefined;
  for (const [prefix, value] of Object.entries(rules.flatRate.profitabilityByAteco)) {
    const p = prefix.replace(/\./g, '');
    if (code.startsWith(p) && (!best || p.length > best.len)) best = { len: p.length, value };
  }
  if (!best) throw new Error(`No profitability coefficient for ATECO ${ateco}`);
  return best.value;
}
