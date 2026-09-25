import 'server-only';
import { cookies, headers } from 'next/headers';
import type {
  AuthResponse,
  BankAccount,
  Customer,
  Deadline,
  F24,
  ImportFile,
  ImportPreviewRow,
  ImportResult,
  InstallmentPlan,
  Invoice,
  InvoiceDetail,
  Payment,
  PaymentTerms,
  PlanOptions,
  PlanPreview,
  RuleSetDetail,
  RuleSetSummary,
  SourceDetail,
  SourceSummary,
  TaxCredit,
  TaxSummary,
  TaxYearData,
  Tenant,
  TenantWithProfile,
  ThresholdOutlook,
  User,
} from './types';

export * from './types';
export * from './format';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api';

export const SESSION_COOKIE = 'opentax_session';
export const TENANT_COOKIE = 'opentax_tenant';

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

export async function currentUser(): Promise<User | null> {
  const token = await currentSessionToken();
  if (!token) return null;
  return fetchOrNull(() => request<User>('/auth/me'));
}

export async function currentTenantId(): Promise<string | null> {
  const user = await currentUser();
  return user?.activeTenantId ?? null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const reqHeaders: Record<string, string> = { ...(init.headers as Record<string, string>) };
  // The API accepts state-changing requests only as JSON (CSRF protection), with or without a body.
  if (init.method && init.method !== 'GET') reqHeaders['content-type'] = 'application/json';

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
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return null;
    throw e;
  }
}

export const api = {
  // Authentication
  login: (data: unknown) => request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: unknown) => request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  authMe: () => request<User>('/auth/me'),
  selectTenant: (tenantId: string) => request<User>('/auth/select-tenant', { method: 'POST', body: JSON.stringify({ tenantId }) }),

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
  invoices: (year?: number) => tenantRequest<Invoice[]>(`/invoices${year ? `?year=${year}` : ''}`),
  invoiceYears: () => tenantRequest<number[]>('/invoices/years'),
  thresholds: () => tenantRequest<ThresholdOutlook>('/invoices/thresholds'),
  exchangeRate: (currency: string, date: string) =>
    request<{ currency: string; requestedDate: string; quotationDate: string; unitsPerEur: number; source: string }>(
      `/exchange-rates?currency=${encodeURIComponent(currency)}&date=${encodeURIComponent(date)}`,
    ),
  invoiceThresholds: (id: string) => tenantRequest<ThresholdOutlook>(`/invoices/${seg(id)}/thresholds`),
  invoice: (id: string) => tenantRequest<InvoiceDetail>(`/invoices/${seg(id)}`),
  createInvoice: (data: unknown) => tenantRequest<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoice: (id: string, data: unknown) => tenantRequest<Invoice>(`/invoices/${seg(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInvoice: (id: string) => tenantRequest<void>(`/invoices/${seg(id)}`, { method: 'DELETE' }),
  issueInvoice: (id: string, data: unknown) => tenantRequest<Invoice>(`/invoices/${seg(id)}/issue`, { method: 'POST', body: JSON.stringify(data) }),
  payments: (invoiceId: string) => tenantRequest<Payment[]>(`/invoices/${seg(invoiceId)}/payments`),
  createPayment: (invoiceId: string, data: unknown) =>
    tenantRequest<Payment>(`/invoices/${seg(invoiceId)}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  deletePayment: (id: string) => tenantRequest<void>(`/payments/${seg(id)}`, { method: 'DELETE' }),

  // Taxes and F24
  taxSummary: (year: number) => tenantRequest<TaxSummary>(`/taxes/${year}/summary`),
  taxYearData: (year: number) => tenantRequest<TaxYearData>(`/taxes/${year}/data`),
  updateTaxYearData: (year: number, data: unknown) => tenantRequest<TaxYearData>(`/taxes/${year}/data`, { method: 'PUT', body: JSON.stringify(data) }),
  taxCredits: () => tenantRequest<TaxCredit[]>('/taxes/credits'),
  taxCredit: (id: string) => tenantRequest<TaxCredit>(`/taxes/credits/${seg(id)}`),
  saveTaxCredit: (data: unknown, id?: string) =>
    tenantRequest<TaxCredit>(id ? `/taxes/credits/${seg(id)}` : '/taxes/credits', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }),
  deleteTaxCredit: (id: string) => tenantRequest<void>(`/taxes/credits/${seg(id)}`, { method: 'DELETE' }),
  f24s: (year: number) => tenantRequest<F24[]>(`/f24?year=${year}`),
  f24: (id: string) => tenantRequest<F24>(`/f24/${seg(id)}`),
  planOptions: (taxYear: number) => tenantRequest<PlanOptions>(`/f24/plans/${taxYear}/options`),
  plan: (taxYear: number) => tenantRequest<InstallmentPlan>(`/f24/plans/${taxYear}`),
  previewPlan: (taxYear: number, data: unknown) =>
    tenantRequest<PlanPreview>(`/f24/plans/${taxYear}/preview`, { method: 'POST', body: JSON.stringify(data) }),
  createPlan: (taxYear: number, data: unknown) =>
    tenantRequest<InstallmentPlan>(`/f24/plans/${taxYear}`, { method: 'POST', body: JSON.stringify(data) }),
  deletePlan: (taxYear: number) => tenantRequest<void>(`/f24/plans/${taxYear}`, { method: 'DELETE' }),
  updateF24Status: (id: string, data: unknown) => tenantRequest<F24>(`/f24/${seg(id)}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
  previewInvoiceImport: (files: ImportFile[]) => tenantRequest<ImportPreviewRow[]>('/invoices/import/preview', { method: 'POST', body: JSON.stringify({ files }) }),
  importInvoices: (files: ImportFile[], selected: string[]) => tenantRequest<ImportResult[]>('/invoices/import', { method: 'POST', body: JSON.stringify({ files, selected }) }),
  f24Pdf: async (id: string) => {
    const sessionToken = await currentSessionToken();
    const headers: Record<string, string> = {};
    if (sessionToken) headers['authorization'] = `Bearer ${sessionToken}`;
    const res = await fetch(`${API_URL}/f24/${seg(id)}/pdf`, { headers, cache: 'no-store' });
    if (!res.ok) throw new ApiError(res.status, 'PDF non disponibile');
    return { fileName: res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'f24.pdf', content: await res.arrayBuffer() };
  },
  invoicePdf: async (id: string) => {
    const sessionToken = await currentSessionToken();
    const headers: Record<string, string> = {};
    if (sessionToken) headers['authorization'] = `Bearer ${sessionToken}`;
    const res = await fetch(`${API_URL}/invoices/${seg(id)}/pdf`, { headers, cache: 'no-store' });
    if (!res.ok) throw new ApiError(res.status, 'PDF non disponibile');
    return { fileName: res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'fattura.pdf', content: await res.arrayBuffer() };
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
    const sessionToken = await currentSessionToken();
    const headers: Record<string, string> = {};
    if (sessionToken) headers['authorization'] = `Bearer ${sessionToken}`;
    const res = await fetch(`${API_URL}/invoices/${seg(id)}/xml`, { headers, cache: 'no-store' });
    if (!res.ok) throw new ApiError(res.status, 'XML non disponibile');
    return { fileName: res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'invoice.xml', content: await res.text() };
  },
};
