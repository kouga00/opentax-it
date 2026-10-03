import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type {
  AuthResponse,
  BankAccount,
  CollectionPayment,
  ContributionCodes,
  Customer,
  Deadline,
  F24,
  ImportFile,
  ImportPreviewRow,
  ImportResult,
  InstallmentPlan,
  Invoice,
  InvoiceCollection,
  InvoiceDetail,
  InvoiceListItem,
  PaymentTerms,
  PecProbeStatus,
  PecProvider,
  PecSettings,
  PlanOptions,
  PlanPreview,
  ProfessionalFund,
  ReceiptsSyncResult,
  RuleSetDetail,
  RuleSetSummary,
  SdiTransmission,
  SourceDetail,
  SourceSummary,
  StampDutyQuarter,
  TaxCredit,
  TaxSummary,
  ReturnGuide,
  InvoicePaymentPlan,
  TaxYearData,
  Tenant,
  TenantWithProfile,
  ThresholdOutlook,
  User,
  UserAccount,
} from './types';

export * from './types';
export * from './format';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api';

export const SESSION_COOKIE = 'opentax_session';

/** Encodes an id for a URL path, so that a crafted id cannot reach another API route. */
const seg = (id: string) => encodeURIComponent(id);

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function currentSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export const currentUser = cache(async (): Promise<User | null> => {
  const token = await currentSessionToken();
  if (!token) return null;
  return fetchOrNull(() => request<User>('/auth/me'));
});

export async function currentTenantId(): Promise<string | null> {
  const user = await currentUser();
  return user?.activeTenantId ?? null;
}

/** Prepares headers with authentication and forwarded client information for fetch requests. */
export async function authHeaders(extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
  const reqHeaders: Record<string, string> = { ...extraHeaders };
  const sessionToken = await currentSessionToken();
  if (sessionToken) {
    reqHeaders['authorization'] = `Bearer ${sessionToken}`;
  }

  try {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    if (forwardedFor) {
      reqHeaders['x-forwarded-for'] = forwardedFor;
    }
    const userAgent = headersList.get('user-agent');
    if (userAgent) {
      reqHeaders['user-agent'] = userAgent;
    }
  } catch {
    // Outside of incoming request context (e.g. build scripts)
  }

  return reqHeaders;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const extraHeaders: Record<string, string> = { ...(init.headers as Record<string, string>) };
  // The API accepts state-changing requests only as JSON (CSRF protection), with or without a body.
  if (init.method && init.method !== 'GET') extraHeaders['content-type'] = 'application/json';

  const reqHeaders = await authHeaders(extraHeaders);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers: reqHeaders, cache: 'no-store' });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = Array.isArray(body?.message) ? body.message.join('; ') : (body?.message ?? res.statusText);
    throw new ApiError(res.status, message);
  }
  return body as T;
}

/** Requests that need authentication and a tenant in the session. */
export async function tenantRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init);
}

export async function fetchOrNull<T>(fn: () => Promise<T>): Promise<T | null> {
  return (await fetchOrReason(fn)).value;
}

/** Like fetchOrNull, with the API message of a 4xx, for pages that explain why something is not available. */
export async function fetchOrReason<T>(fn: () => Promise<T>): Promise<{ value: T; reason?: undefined } | { value: null; reason: string }> {
  try {
    return { value: await fn() };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) {
        redirect('/session-expired');
      }
      if (e.status >= 400 && e.status < 500) return { value: null, reason: e.message };
    }
    throw e;
  }
}

export const api = {
  // Authentication
  login: (data: unknown) => request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  authMe: () => request<User>('/auth/me'),
  selectTenant: (tenantId: string) => request<User>('/auth/select-tenant', { method: 'POST', body: JSON.stringify({ tenantId }) }),

  // Users (platform admin only)
  users: () => request<UserAccount[]>('/users'),
  createUser: (data: unknown) => request<UserAccount>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: unknown) => request<UserAccount>(`/users/${seg(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  setUserMemberships: (id: string, memberships: unknown) => request<UserAccount>(`/users/${seg(id)}/memberships`, { method: 'PUT', body: JSON.stringify({ memberships }) }),
  deleteUser: (id: string) => request<void>(`/users/${seg(id)}`, { method: 'DELETE' }),

  // Tenants and Profiles
  tenants: () => request<Tenant[]>('/tenants'),
  me: () => tenantRequest<TenantWithProfile>('/tenants/me'),
  updateMe: (data: unknown) => tenantRequest<TenantWithProfile>('/tenants/me', { method: 'PUT', body: JSON.stringify(data) }),
  bankAccounts: () => tenantRequest<BankAccount[]>('/tenants/me/bank-accounts'),
  saveBankAccount: (data: unknown, id?: string) =>
    tenantRequest<BankAccount>(id ? `/tenants/me/bank-accounts/${seg(id)}` : '/tenants/me/bank-accounts', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(data),
    }),
  deleteBankAccount: (id: string) => tenantRequest<void>(`/tenants/me/bank-accounts/${seg(id)}`, { method: 'DELETE' }),
  pecProviders: () => request<PecProvider[]>('/sdi/pec-providers'),
  pecSettings: () => tenantRequest<PecSettings>('/sdi/pec-settings'),
  savePecSettings: (data: unknown) => tenantRequest<PecSettings>('/sdi/pec-settings', { method: 'PUT', body: JSON.stringify(data) }),
  sdiTransmissions: (invoiceId: string) => tenantRequest<SdiTransmission[]>(`/invoices/${seg(invoiceId)}/sdi-transmissions`),
  sendPecProbe: () => tenantRequest<PecProbeStatus>('/sdi/pec-probe', { method: 'POST' }),
  pecProbeStatus: () => tenantRequest<PecProbeStatus>('/sdi/pec-probe'),
  syncReceipts: () => tenantRequest<ReceiptsSyncResult>('/sdi/receipts/sync', { method: 'POST' }),
  sendToSdi: (invoiceId: string) => tenantRequest<SdiTransmission>(`/invoices/${seg(invoiceId)}/sdi-transmissions`, { method: 'POST' }),
  paymentTerms: () => tenantRequest<PaymentTerms[]>('/tenants/me/payment-terms'),
  savePaymentTerms: (data: unknown, id?: string) =>
    tenantRequest<PaymentTerms>(id ? `/tenants/me/payment-terms/${seg(id)}` : '/tenants/me/payment-terms', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(data),
    }),
  deletePaymentTerms: (id: string) => tenantRequest<void>(`/tenants/me/payment-terms/${seg(id)}`, { method: 'DELETE' }),
  inpsOffices: () => request<Array<{ id: string; code: string; name: string }>>('/tenants/inps-offices'),
  createTenant: (data: unknown) => tenantRequest<Tenant>('/tenants', { method: 'POST', body: JSON.stringify(data) }),

  // Fiscal Rules and Sources
  activateRuleSet: (id: string) => request<RuleSetSummary>(`/fiscal-rules/${seg(id)}/activate`, { method: 'POST' }),
  seedRuleSets: () => request<{ inserted: Array<{ year: number; version: number }> }>('/fiscal-rules/seed', { method: 'POST' }),
  professionalFunds: () => request<ProfessionalFund[]>('/tenants/professional-funds'),
  ruleSets: (year: number) => request<RuleSetSummary[]>(`/fiscal-rules/${year}`),
  ruleSet: (id: string) => request<RuleSetDetail>(`/fiscal-rules/sets/${seg(id)}`),
  activeRules: (year: number) =>
    request<{ inps: { surchargePct: number; fullRatePct: number; reducedRatePct: number }; installments: { annualInterestPct: number; incrementPct: number } }>(
      `/fiscal-rules/${year}/active`,
    ),
  ruleSetStatus: (year: number) => request<{ year: number; ok: boolean; reason?: string }>(`/fiscal-rules/${year}/status`),
  deadlines: (year: number) => request<Deadline[]>(`/fiscal-rules/${year}/deadlines?extension=true`),

  // Customers
  customers: () => tenantRequest<Customer[]>('/customers'),
  customer: (id: string) => tenantRequest<Customer>(`/customers/${seg(id)}`),
  createCustomer: (data: unknown) => tenantRequest<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: unknown) => tenantRequest<Customer>(`/customers/${seg(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => tenantRequest<void>(`/customers/${seg(id)}`, { method: 'DELETE' }),

  // Invoices and Payments
  invoices: (year?: number) => tenantRequest<InvoiceListItem[]>(`/invoices${year ? `?year=${year}` : ''}`),
  invoiceYears: () => tenantRequest<number[]>('/invoices/years'),
  thresholds: () => tenantRequest<ThresholdOutlook>('/revenue-thresholds'),
  exchangeRate: (currency: string, date: string) =>
    request<{ currency: string; requestedDate: string; quotationDate: string; unitsPerEur: number; source: string }>(
      `/exchange-rates?currency=${encodeURIComponent(currency)}&date=${encodeURIComponent(date)}`,
    ),
  invoiceThresholds: (id: string) => tenantRequest<ThresholdOutlook>(`/invoices/${seg(id)}/thresholds`),
  invoice: (id: string) => tenantRequest<InvoiceDetail>(`/invoices/${seg(id)}`),
  createInvoice: (data: unknown) => tenantRequest<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoice: (id: string, data: unknown) => tenantRequest<Invoice>(`/invoices/${seg(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInvoice: (id: string) => tenantRequest<void>(`/invoices/${seg(id)}`, { method: 'DELETE' }),
  createInvoiceReplacement: (id: string) => tenantRequest<InvoiceDetail>(`/invoices/${seg(id)}/replacement`, { method: 'POST' }),
  reopenInvoiceForCorrection: (id: string) => tenantRequest<InvoiceDetail>(`/invoices/${seg(id)}/correction`, { method: 'POST' }),
  issueInvoice: (id: string, data: unknown) => tenantRequest<Invoice>(`/invoices/${seg(id)}/issue`, { method: 'POST', body: JSON.stringify(data) }),
  collection: (invoiceId: string) => tenantRequest<InvoiceCollection>(`/invoices/${seg(invoiceId)}/collection`),
  createPayment: (invoiceId: string, data: unknown) => tenantRequest<CollectionPayment>(`/invoices/${seg(invoiceId)}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  deletePayment: (id: string) => tenantRequest<void>(`/payments/${seg(id)}`, { method: 'DELETE' }),

  // Taxes and F24
  taxSummary: (year: number) => tenantRequest<TaxSummary>(`/taxes/${year}/summary`),
  returnGuide: (year: number) => tenantRequest<ReturnGuide>(`/taxes/${year}/return-guide`),
  fileReturn: (year: number, filedOn: string) => tenantRequest<unknown>(`/taxes/${year}/return`, { method: 'PUT', body: JSON.stringify({ filedOn }) }),
  unfileReturn: (year: number) => tenantRequest<void>(`/taxes/${year}/return`, { method: 'DELETE' }),
  taxYearData: (year: number) => tenantRequest<TaxYearData>(`/taxes/${year}/data`),
  updateTaxYearData: (year: number, data: unknown) => tenantRequest<TaxYearData>(`/taxes/${year}/data`, { method: 'PUT', body: JSON.stringify(data) }),
  taxCredits: () => tenantRequest<TaxCredit[]>('/tax-credits'),
  taxCredit: (id: string) => tenantRequest<TaxCredit>(`/tax-credits/${seg(id)}`),
  saveTaxCredit: (data: unknown, id?: string) => tenantRequest<TaxCredit>(id ? `/tax-credits/${seg(id)}` : '/tax-credits', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }),
  deleteTaxCredit: (id: string) => tenantRequest<void>(`/tax-credits/${seg(id)}`, { method: 'DELETE' }),
  f24s: (year: number) => tenantRequest<F24[]>(`/f24?year=${year}`),
  f24: (id: string) => tenantRequest<F24>(`/f24/${seg(id)}`),
  planOptions: (taxYear: number) => tenantRequest<PlanOptions>(`/installment-plans/${taxYear}/options`),
  plan: (taxYear: number) => tenantRequest<InstallmentPlan>(`/installment-plans/${taxYear}`),
  previewPlan: (taxYear: number, data: unknown) => tenantRequest<PlanPreview>(`/installment-plans/${taxYear}/preview`, { method: 'POST', body: JSON.stringify(data) }),
  createPlan: (taxYear: number, data: unknown) => tenantRequest<InstallmentPlan>(`/installment-plans/${taxYear}`, { method: 'POST', body: JSON.stringify(data) }),
  deletePlan: (taxYear: number) => tenantRequest<void>(`/installment-plans/${taxYear}`, { method: 'DELETE' }),
  updateF24Status: (id: string, data: unknown) => tenantRequest<F24>(`/f24/${seg(id)}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  contributionCodes: () => request<ContributionCodes>('/f24/contribution-codes'),
  createContributionF24: (data: unknown) => tenantRequest<F24>('/f24', { method: 'POST', body: JSON.stringify(data) }),
  createFixedContributions: (year: number) => tenantRequest<F24[]>(`/f24/fixed-contributions/${year}`, { method: 'POST' }),
  deleteF24: (id: string) => tenantRequest<void>(`/f24/${seg(id)}`, { method: 'DELETE' }),
  stampDuty: (year: number) => tenantRequest<StampDutyQuarter[]>(`/stamp-duty?year=${year}`),
  createStampDutyF24: (year: number, quarter: number, data: unknown) => tenantRequest<F24>(`/stamp-duty/${year}/${quarter}/f24`, { method: 'POST', body: JSON.stringify(data) }),
  markStampDutyPaid: (year: number, quarter: number, data: unknown) => tenantRequest<StampDutyQuarter>(`/stamp-duty/${year}/${quarter}/payment`, { method: 'PUT', body: JSON.stringify(data) }),
  unmarkStampDutyPaid: (year: number, quarter: number) => tenantRequest<void>(`/stamp-duty/${year}/${quarter}/payment`, { method: 'DELETE' }),
  previewImport: (files: ImportFile[]) => tenantRequest<ImportPreviewRow[]>('/imports/preview', { method: 'POST', body: JSON.stringify({ files }) }),
  importDocuments: (files: ImportFile[], selected: string[]) => tenantRequest<ImportResult[]>('/imports', { method: 'POST', body: JSON.stringify({ files, selected }) }),
  f24Pdf: async (id: string) => {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/f24/${seg(id)}/pdf`, { headers, cache: 'no-store' });
    if (!res.ok) throw new ApiError(res.status, 'PDF non disponibile');
    return { fileName: res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'f24.pdf', content: await res.arrayBuffer() };
  },
  /** File of the F24 forms to pay on a date, for File Internet; the API explains in its message what is missing. */
  f24TelematicFile: async (date: string) => {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/f24/telematic-file?date=${encodeURIComponent(date)}`, { headers, cache: 'no-store' });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new ApiError(res.status, body?.message ?? 'File non disponibile');
    }
    return { fileName: res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'F24.txt', content: await res.arrayBuffer() };
  },
  draftPayment: (id: string) => tenantRequest<InvoicePaymentPlan | null>(`/invoices/${seg(id)}/payment`),
  invoicePdf: async (id: string) => {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/invoices/${seg(id)}/pdf`, { headers, cache: 'no-store' });
    if (!res.ok) throw new ApiError(res.status, 'PDF non disponibile');
    return { fileName: res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'fattura.pdf', content: await res.arrayBuffer() };
  },
  /** Server-Sent Events of the PEC mailbox test, passed through as they arrive; `signal` stops the test when the page leaves. */
  pecTestStream: async (signal: AbortSignal) => {
    const tenantId = await currentTenantId();
    if (!tenantId) throw new ApiError(400, 'Nessun tenant selezionato');
    const headers = await authHeaders({ accept: 'text/event-stream' });
    const res = await fetch(`${API_URL}/sdi/pec-settings/test`, { headers, cache: 'no-store', signal });
    if (!res.ok || !res.body) throw new ApiError(res.status, 'Prova della connessione non disponibile');
    return res.body;
  },
  sources: () => request<SourceSummary[]>('/sources'),
  source: (id: string) => request<SourceDetail>(`/sources/${seg(id)}`),
  sourceFile: async (id: string, text: boolean) => {
    const res = await fetch(`${API_URL}/sources/${seg(id)}/file${text ? '?text=true' : ''}`, { cache: 'no-store' });
    if (!res.ok) throw new ApiError(res.status, 'File non disponibile');
    return {
      contentType: res.headers.get('content-type') ?? 'application/octet-stream',
      disposition: res.headers.get('content-disposition') ?? 'inline',
      content: await res.arrayBuffer(),
    };
  },
  invoiceXml: async (id: string) => {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/invoices/${seg(id)}/xml`, { headers, cache: 'no-store' });
    if (!res.ok) throw new ApiError(res.status, 'XML non disponibile');
    return { fileName: res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'invoice.xml', content: await res.text() };
  },
};
