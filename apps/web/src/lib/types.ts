// Shared API types (client-safe).

export type UserRole = 'PLATFORM_ADMIN' | 'TENANT_ADMIN' | 'TENANT_USER';

export interface TenantMembershipSummary {
  id: string;
  name: string;
  role: string;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  activeTenantId: string | null;
  tenants: TenantMembershipSummary[];
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: User;
}

export interface Deadline {
  kind: string;
  nominalDate: string;
  date: string;
  description: string;
  details: { taxYear: number; percentage?: number; quarter?: number; splittable?: boolean; amount?: number; deferredFrom?: string; amountAvailableOn?: string; estimated?: boolean };
  code?: string;
  source?: string;
}

export interface RuleSetSummary {
  id: string;
  year: number;
  version: number;
  status: 'DRAFT' | 'PROPOSED' | 'ACTIVE' | 'SUPERSEDED';
  activatedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  createdAt: string;
}

export interface TenantProfile {
  revenueLimit: string | null;
  sdiFileProgressiveStart: string | null;
  businessName: string | null;
  firstName: string;
  lastName: string;
  fiscalCode: string;
  vatNumber: string;
  atecoCode: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  activityStartYear: number;
  reducedRate: boolean;
  isaSubject: boolean;
  birthDate: string | null;
  sex: string | null;
  birthPlace: string | null;
  birthProvince: string | null;
  socialSecurityScheme: SocialSecurityScheme;
  inpsFlatRateReduction: boolean;
  inpsSeniorityBefore1996: boolean;
  applyInpsSurcharge: boolean;
  professionalFundType: string | null;
  professionalFundRatePct: string | null;
  viesRegistered: boolean;
  inpsOfficeId: string | null;
}

/** Codes for contribution rows entered by hand (GET /f24/contribution-codes). */
export interface ContributionReason { code: string; description: string; deduction: 'YES' | 'NO' | 'MIXED' | 'UNKNOWN' }
export interface OtherEntity { code: string; name: string; fundType?: string; period: 'MONTH_YEAR' | 'YEAR'; periodRule: string; positionCode: 'NONE' | 'REQUIRED'; reasons: ContributionReason[] }
export interface ContributionCodes { otherEntities: OtherEntity[]; selfEmployedReasons: ContributionReason[] }

/** Professional fund of the FatturaPA schema (TipoCassa TC01-TC21), from GET /tenants/professional-funds. */
export interface ProfessionalFund { code: string; name: string }

/** Social security scheme of the profile; values of the Prisma enum SocialSecurityScheme (apps/api/prisma/schema.prisma). */
export type SocialSecurityScheme = 'INPS_SEPARATE' | 'INPS_ARTISANS' | 'INPS_TRADERS' | 'PROFESSIONAL_FUND';

export interface TenantWithProfile extends Tenant {
  profile: TenantProfile;
}

export type CustomerKind = 'IT_B2B' | 'IT_B2C' | 'IT_PA' | 'EU' | 'EU_B2C' | 'NON_EU' | 'NON_EU_B2C';

export interface Customer {
  id: string;
  kind: CustomerKind;
  businessName: string | null;
  firstName: string | null;
  lastName: string | null;
  vatNumber: string | null;
  fiscalCode: string | null;
  countryCode: string;
  address: string;
  postalCode: string | null;
  city: string;
  province: string | null;
  country: string;
  recipientCode: string;
  recipientPec: string | null;
  currency: string;
  art7SeptiesServices: boolean;
  notes: string | null;
}

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'SENT' | 'DELIVERED' | 'NOT_DELIVERED' | 'REJECTED' | 'CANCELLED';

export interface InvoiceLine {
  lineNumber: number;
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceCustomerSummary {
  id: string;
  kind: CustomerKind;
  businessName: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface Invoice {
  id: string;
  type: 'TD01' | 'TD04' | 'TD05' | 'TD06';
  year: number;
  number: string;
  date: string;
  currency: string;
  /** EUR per unit of the invoice currency (1 for EUR). */
  exchangeRate: number;
  vatNature: 'N2_1' | 'N2_2';
  taxableAmount: number;
  inpsSurcharge: number;
  professionalFundType: string | null;
  professionalFundRatePct: number | null;
  professionalFundContribution: number;
  virtualStamp: boolean;
  stampAmount: number;
  total: number;
  notes: string[];
  status: InvoiceStatus;
  refInvoiceId: string | null;
  paymentTermsId: string | null;
  bankAccountId: string | null;
  /** ModalitaPagamento asked of the customer, e.g. MP05; null when the document has no DatiPagamento. */
  paymentMethod: string | null;
  xmlFileName: string | null;
  /** Imported from an XML issued and sent to SDI with another tool: it cannot be sent from here. */
  imported: boolean;
  /** Issued for the tax rules: delivered or made available by SDI, or imported. */
  issued: boolean;
  /** Draft of an invoice rejected by SDI, to correct and send again with the same number and date. */
  correction: boolean;
  /** Day SDI delivered it or made it available (YYYY-MM-DD): the quarter of its stamp duty. */
  sdiDeliveredOn: string | null;
  /** Rejected invoice this one replaces with a new number and date. */
  replacesInvoiceId: string | null;
  /** Invoice that replaces this rejected one (number empty while it is a draft). */
  replacedBy: { id: string; number: string } | null;
  internalNotes: string | null;
  customer: InvoiceCustomerSummary;
  lines?: InvoiceLine[];
}

/** A document of the list (API: GET /invoices), with what was already collected, or refunded for a credit note. */
export interface InvoiceListItem extends Invoice {
  collected: number;
}

export interface InvoiceDetail extends Invoice {
  lines: InvoiceLine[];
}

export interface Payment {
  id: string;
  invoiceId: string;
  date: string;
  amount: string;
  amountEur: string;
  exchangeRate: string;
  method: string | null;
  notes: string | null;
}

export interface AdvanceSchedule {
  total: number;
  first: number;
  second: number;
  mode: 'NOT_DUE' | 'SINGLE' | 'TWO_INSTALMENTS';
}

export interface TaxSummary {
  year: number;
  rulesYear: number;
  paymentRulesYear: number;
  warnings: string[];
  collectedRevenue: number;
  thresholds: { collectedRevenue: number; accessThreshold: number; exitThreshold: number; exceedsAccessThreshold: boolean; exceedsExitThreshold: boolean };
  /** `computed` false: the scheme's contributions are not computed and the INPS amounts are 0. */
  contributions: {
    scheme: SocialSecurityScheme;
    computed: boolean;
    /** Artigiani and Commercianti: contribution on the minimum income in four installments. */
    fixed: { ivs: number; maternity: number; total: number; installments: Array<{ number: number; date: string; amount: number }> } | null;
    flatRateReduction?: boolean;
  };
  input: {
    atecoCode: string;
    activityStartYear: number;
    reducedRateEligible: boolean;
    isaSubject: boolean;
    contributionsPaid: number;
    taxAdvancesPaid: number;
    inpsAdvancesPaid: number;
    taxCredits: number;
    inpsRatePct: number;
    nextYearInpsRatePct: number;
    inpsFixedCodes: string[];
    inpsExcessCode: string | null;
    /** Entered by hand (payments made outside the tool). */
    manual: { contributionsPaid: number; taxAdvancesPaid: number; inpsAdvancesPaid: number };
    /** From F24 forms marked as paid here. */
    fromF24: { contributionsPaid: number; taxAdvancesPaid: number; inpsAdvancesPaid: number };
  };
  result: {
    coefficientPct: number;
    grossIncome: number;
    contributionsDeducted: number;
    netIncome: number;
    taxRatePct: number;
    substituteTax: number;
    taxNetOfCredits: number;
    inpsTaxableIncome: number;
    inpsContribution: number;
  };
  taxBalance: number;
  inpsBalance: number;
  nextYearAdvances: { tax: AdvanceSchedule; inps: AdvanceSchedule };
}

export interface TaxYearData {
  year: number;
  contributionsPaid: string;
  taxAdvancesPaid: string;
  inpsAdvancesPaid: string;
  taxCredits: string;
  inpsReducedRate: boolean;
  /** INPS Artigiani/Commercianti: codes of the four fixed installments and of the contribution above the minimum. */
  inpsFixedCodes: string[];
  inpsExcessCode: string | null;
}

/** An INPS code saved in the year data, with what it is for, to suggest it in the F24 forms. */
export interface KnownInpsCode { code: string; label: string }

/** A file sent to the invoice import: an XML file or a ZIP archive of them. */
export interface ImportFile {
  name: string;
  contentBase64: string;
}

/** What an imported XML file is (fatturapa xmlDocumentKind). */
export type XmlDocumentKind = 'INVOICE' | 'SDI_RECEIPT' | 'SDI_MESSAGE' | 'SDI_METADATA';

export interface ImportPreviewRow {
  file: string;
  kind?: XmlDocumentKind;
  status: 'NEW' | 'DUPLICATE' | 'ERROR' | 'IGNORED';
  documentType?: string;
  number?: string;
  date?: string;
  customer?: string;
  total?: number;
  invoiceId?: string;
  /** Row to import together: the invoice of a receipt in the same upload. */
  requires?: string;
  message?: string;
}

export interface ImportResult {
  file: string;
  kind?: XmlDocumentKind;
  status: 'IMPORTED' | 'SKIPPED' | 'ERROR';
  number?: string;
  invoiceId?: string;
  customer?: string;
  message?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  bankName: string | null;
  iban: string;
  bic: string | null;
  isDefault: boolean;
}

export interface PaymentTerms {
  id: string;
  name: string;
  /** Days of each installment, e.g. [30, 60, 90]. */
  dueDays: number[];
  /** "Fine mese": each due date moves to the last day of its month. */
  fromMonthEnd: boolean;
  /** "30/60/90 gg fine mese", from the API. */
  label: string;
  method: string;
  isDefault: boolean;
}

export type PlanStart = 'ORDINARY' | 'EXTENDED' | 'DEFERRED' | 'DEFERRED_EXTENDED';

export interface PlanOptions {
  taxYear: number;
  paymentYear: number;
  rulesYear: number;
  warnings: string[];
  starts: Array<{ start: PlanStart; date: string; surchargePct: number; maxInstallments: number; source?: string }>;
  secondAdvanceDate: string;
}

export type F24Kind = 'BALANCE' | 'FIRST_ADVANCE' | 'SECOND_ADVANCE' | 'INSTALLMENT' | 'COMPENSATION' | 'STAMP_DUTY' | 'TAX_NOTICE' | 'OTHER';
export type F24Status = 'PLANNED' | 'PAID' | 'CANCELLED';

export type F24Section = 'TREASURY' | 'INPS' | 'REGIONAL' | 'LOCAL' | 'OTHER_ENTITY';

export interface F24Line {
  id?: string;
  section: F24Section;
  role?: 'BALANCE' | 'FIRST_ADVANCE' | 'SECOND_ADVANCE' | 'INTEREST' | 'CREDIT' | 'CONTRIBUTION' | 'OTHER';
  code: string;
  officeCode?: string | null;
  /** Other entities: "codice ente". */
  entityCode?: string | null;
  /** INPS "matricola/codice INPS"; other entities "codice posizione". */
  positionCode?: string | null;
  deductibleAmount?: number;
  installmentCode?: string | null;
  localCode?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  referenceYear: number;
  debitAmount: string | number;
  creditAmount?: string | number;
  description?: string | null;
}

export interface F24Draft {
  kind: F24Kind;
  paymentDate: string;
  nominalPaymentDate?: string;
  installmentNumber?: number | null;
  installmentsTotal?: number | null;
  totalDebit: string | number;
  totalCredit?: string | number;
  lines: F24Line[];
}

export interface F24 extends F24Draft {
  id: string;
  status: F24Status;
  paidOn?: string | null;
  /** How it was paid, written when it is marked as paid. */
  notes?: string | null;
  planId?: string | null;
  plan?: { taxYear: number; installments: number } | null;
}

export interface PlanPreview {
  taxYear: number;
  paymentYear: number;
  rulesYear: number;
  start: PlanStart;
  firstDueDate: string;
  surchargePct: number;
  installments: number;
  maxInstallments: number;
  due: PlanAmounts;
  amounts: PlanAmounts;
  credits: { tax: number; inps: number };
  compensation: { used: number; unused: number; order: 'INPS_FIRST' | 'TAX_FIRST'; usages: Array<{ creditId: string; amount: number }> };
  inpsOfficeCode: string | null;
  forms: F24Draft[];
  warnings: string[];
}

export interface PlanAmounts {
  taxBalance: number;
  taxFirstAdvance: number;
  taxSecondAdvance: number;
  inpsBalance: number;
  inpsFirstAdvance: number;
  inpsSecondAdvance: number;
}

export interface TaxCredit {
  id: string;
  section: F24Section;
  code: string;
  localCode: string | null;
  installmentCode: string | null;
  referenceYear: number;
  amount: number;
  /** YYYY-MM-DD */
  usableFrom: string | null;
  description: string | null;
  notes: string | null;
  used: number;
  remaining: number;
  /** Uses in F24 forms. */
  usages: Array<{ amount: number; f24Id: string; paymentDate: string; f24Status: string }>;
}

export interface InstallmentPlan {
  id: string;
  taxYear: number;
  paymentYear: number;
  /** YYYY-MM-DD */
  firstDueDate: string;
  installments: number;
  surchargePct: number;
  taxBalance: number;
  taxFirstAdvance: number;
  taxSecondAdvance: number;
  inpsBalance: number;
  inpsFirstAdvance: number;
  inpsSecondAdvance: number;
  creditsUsed: number;
  ruleSetVersion: number | null;
  createdAt: string;
  f24s: F24[];
}

export type ThresholdLevel = 'OK' | 'NEAR' | 'OVER';

/** Revenue thresholds of the current year (L. 190/2014 par. 54 and 71), cash basis plus projection. */
export interface ThresholdOutlook {
  collectedRevenue: number;
  accessThreshold: number;
  exitThreshold: number;
  exceedsAccessThreshold: boolean;
  exceedsExitThreshold: boolean;
  outstanding: number;
  invoiceTotal: number;
  projected: number;
  accessLevel: ThresholdLevel;
  exitLevel: ThresholdLevel;
  personalLimit: number | null;
  projectedOverExit: boolean;
  projectedOverPersonalLimit: boolean;
}

export type SourceKind = 'law' | 'circular' | 'resolution' | 'instructions' | 'specification' | 'guide' | 'table' | 'web-page';

/** An entry of the official source registry (docs/fonti/registro.json). */
export interface SourceRecord {
  id: string;
  authority: string;
  title: string;
  kind: SourceKind;
  url: string;
  fetchUrl?: string;
  format: 'pdf' | 'html' | 'xls';
  file: string;
  text?: string;
  retrievedOn: string;
  sha256: string;
}

export interface SourceSummary extends SourceRecord {
  /** Entries of the active rule sets that cite the source. */
  citations: number;
  years: number[];
}

export interface SourceCitation {
  year: number;
  version: number;
  key: string;
  value: unknown;
  title: string;
  quote: string;
  verifiedOn: string;
  main: boolean;
  excerpts: Array<Array<{ text: string; mark: boolean }>>;
  missing: string[];
}

export interface SourceDetail {
  source: SourceRecord;
  citations: SourceCitation[];
}

export interface RuleSourceRef {
  sourceId?: string;
  url: string;
  title: string;
  quote: string;
  verifiedOn: string;
  additional?: Array<{ sourceId: string; quote: string }>;
}

/** A stored rule set with the source of each value and the changes from the active set of its year. */
export interface RuleSetDetail extends RuleSetSummary {
  fields: Array<{ path: string; value: unknown; refKey: string | null; ref: RuleSourceRef | null }>;
  /** sourceRefs entries that are not a value (e.g. the INPS reasons table). */
  documents: Array<{ key: string; ref: RuleSourceRef }>;
  comparison: {
    against: { id: string; version: number };
    values: Array<{ path: string; before: unknown; after: unknown }>;
    sources: Array<{ key: string; before?: RuleSourceRef; after?: RuleSourceRef }>;
  } | null;
}

/** A collection as returned by GET /invoices/:id/collection. */
export interface CollectionPayment {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** In the document currency; negative for a refund. */
  amount: number;
  amountEur: number;
  exchangeRate: number;
  method: string | null;
  notes: string | null;
}

/** What an issued document asks, what was collected and what is left, in the document currency. */
export interface InvoiceCollection {
  invoiceId: string;
  currency: string;
  total: number;
  /** Credit note: collections are refunds, recorded as negative amounts. */
  refund: boolean;
  /** Collected (refunded) so far, as a positive amount. */
  collected: number;
  remaining: number;
  paymentMethod: string | null;
  payments: CollectionPayment[];
}

/** PEC provider with preset servers (API: GET /sdi/pec-providers). */
export interface PecProvider {
  id: string;
  name: string;
  smtpHost: string;
  smtpPort: number;
  imapHost: string;
  imapPort: number;
  usernameHint?: string;
  passwordHint?: string;
  clientGuideUrl: string;
  sourceUrl: string;
  verifiedOn: string;
}

/** PEC mailbox settings; the password is never returned, only whether one is stored. */
export interface PecSettings {
  provider: string | null;
  address: string | null;
  username: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  imapHost: string | null;
  imapPort: number | null;
  hasPassword: boolean;
  sdiPecAssigned: string | null;
  /** Where the next transmission goes: the assigned address, or sdi01@pec.fatturapa.it before the first one. */
  recipient: string;
  encryptionConfigured: boolean;
  /** Last complete reading of the mailbox for receipts (ISO 8601), and the reason of the last failure. */
  lastReceiptsSyncAt: string | null;
  lastReceiptsSyncError: string | null;
  /** Last test PEC sent to SDI (ISO 8601), if any. */
  probeSentAt: string | null;
  probeRecipient: string | null;
}

/** Replies to the last test PEC sent to SDI, read from the mailbox. */
export interface PecProbeStatus {
  sentAt: string | null;
  recipient: string | null;
  acceptedAt?: string;
  deliveredAt?: string;
  providerError?: string;
  sdiReply?: { from: string; subject?: string; receivedAt?: string; text?: string };
}

export type PecTestStep = 'SMTP_CONNECT' | 'SMTP_LOGIN' | 'IMAP_CONNECT' | 'IMAP_LOGIN';
export type PecTestStepStatus = 'RUNNING' | 'OK' | 'FAILED' | 'SKIPPED';

/** Data of the Server-Sent Events of the PEC test: "step" events carry step and status, the "done" event carries ok. */
export interface PecTestEventData {
  step?: PecTestStep;
  status?: PecTestStepStatus;
  ok?: boolean;
  message?: string;
}

export type SdiTransmissionStatus = 'PENDING' | 'SENT' | 'ACCEPTED_BY_PEC' | 'DELIVERED_TO_SDI' | 'SDI_DELIVERED' | 'SDI_NOT_DELIVERED' | 'SDI_REJECTED' | 'ERROR';

export interface SdiTransmission {
  id: string;
  /** PEC from here, or OTHER: sent with another tool, known from uploaded SDI receipts. */
  channel: 'PEC' | 'OTHER';
  fileName: string;
  status: SdiTransmissionStatus;
  sentAt: string | null;
  lastError: string | null;
  createdAt: string;
  /** IdentificativoSdI, from the first SDI receipt. */
  sdiId: string | null;
  /** Receipts, newest first: SDI (RC, NS, MC) or PEC provider (PEC_ACCETTAZIONE...). */
  notifications: SdiNotification[];
  /** Shown when an outcome is late. */
  warning: string | null;
}

export interface SdiNotification {
  type: string;
  receivedAt: string;
  sdiId: string | null;
  fileName: string | null;
}

export interface ReceiptsSyncResult {
  status: 'DONE' | 'BUSY' | 'NOT_CONFIGURED' | 'ERROR';
  read: number;
  matched: number;
  message?: string;
}

/** A row of the pre-filled Redditi PF with the value computed by the app (packages/fiscal-rules, tax-return-lm.ts). */
export interface ReturnRow {
  id: string;
  row: string;
  column?: number;
  value: number | string | null;
  action: 'ENTER' | 'CHECK' | 'RESULT' | 'YOURS';
}

export interface RevenueDifference {
  invoiceId: string;
  number: string;
  date: string;
  customer: string;
  amount: number;
}

export interface ReturnGuide {
  year: number;
  /** Forms of the return: LM (substitute tax), RR (contributions, when computed), RX (result). */
  forms: Array<{ id: 'LM' | 'RR' | 'RX'; rows: ReturnRow[] }>;
  revenue: { issuedInYear: number; collectedInYear: number; notCollectedInYear: RevenueDifference[]; collectedFromOtherYears: RevenueDifference[] };
  warnings: string[];
  /** The return marked as filed and the credits it registered, if it is. */
  filed: { filedOn: string; credits: Array<{ id: string; section: string; code: string; referenceYear: number; amount: number }> } | null;
}

/** Payment of a draft as it will be written at issue (GET /invoices/:id/payment). */
export interface InvoicePaymentPlan {
  method?: string;
  iban?: string;
  bic?: string;
  installments: Array<{ dueDate?: string; amount: number }>;
}

/** A quarter of the stamp duty on e-invoices (API: GET /stamp-duty). */
export interface StampDutyQuarter {
  year: number;
  quarter: number;
  taxCode: string;
  estimatedAmount: number;
  estimated: boolean;
  dueAmount: number | null;
  paymentDeadline: string;
  deferredFrom: string | null;
  listBChangesBy: string | null;
  amountAvailableOn: string | null;
  f24: { id: string; status: F24Status; paymentDate: string; paidOn: string | null } | null;
  paidOnPortal: string | null;
}
