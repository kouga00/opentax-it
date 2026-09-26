import 'server-only';
import { cookies } from 'next/headers';
import type { BankAccount, Customer, Deadline, RuleSetDetail, SourceDetail, SourceSummary, F24, ImportFile, ImportPreviewRow, ImportResult, InstallmentPlan, Invoice, CollectionPayment, InvoiceCollection, InvoiceDetail, PecProvider, PecSettings, SdiTransmission, ThresholdOutlook, PaymentTerms, PlanOptions, PlanPreview, RuleSetSummary, TaxCredit, TaxSummary, TaxYearData, Tenant, TenantWithProfile } from './types';

export * from './types';
export * from './format';

const API_URL = process.env.API_URL ?? 'http://localhost:3000/api';

export const TENANT_COOKIE = 'opentax_tenant';

/** Encodes an id for a URL path, so that a crafted id cannot reach another API route. */
const seg = (id: string) => encodeURIComponent(id);

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export async function currentTenantId(): Promise<string | null> {
  const store = await cookies();
  return store.get(TENANT_COOKIE)?.value ?? null;
}

async function request<T>(path: string, init: RequestInit = {}, tenantId?: string | null): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  // The API accepts state-changing requests only as JSON (CSRF protection), with or without a body.
  if (init.method && init.method !== 'GET') headers['content-type'] = 'application/json';
  if (tenantId) headers['x-tenant-id'] = tenantId;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = Array.isArray(body?.message) ? body.message.join('; ') : (body?.message ?? res.statusText);
    throw new ApiError(res.status, message);
  }
  return body as T;
}

/** Requests that need a tenant; the tenant id comes from the cookie set on /setup. */
export async function tenantRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tenantId = await currentTenantId();
  if (!tenantId) throw new ApiError(400, 'Nessun tenant selezionato');
  return request<T>(path, init, tenantId);
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
  tenants: () => request<Tenant[]>('/tenants'),
  me: () => tenantRequest<TenantWithProfile>('/tenants/me'),
  updateMe: (data: unknown) => tenantRequest<TenantWithProfile>('/tenants/me', { method: 'PUT', body: JSON.stringify(data) }),
  bankAccounts: () => tenantRequest<BankAccount[]>('/tenants/me/bank-accounts'),
  saveBankAccount: (data: unknown, id?: string) => tenantRequest<BankAccount>(id ? `/tenants/me/bank-accounts/${seg(id)}` : '/tenants/me/bank-accounts', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }),
  deleteBankAccount: (id: string) => tenantRequest<void>(`/tenants/me/bank-accounts/${seg(id)}`, { method: 'DELETE' }),
  pecProviders: () => request<PecProvider[]>('/sdi/pec-providers'),
  pecSettings: () => tenantRequest<PecSettings>('/sdi/pec-settings'),
  savePecSettings: (data: unknown) => tenantRequest<PecSettings>('/sdi/pec-settings', { method: 'PUT', body: JSON.stringify(data) }),
  sdiTransmissions: (invoiceId: string) => tenantRequest<SdiTransmission[]>(`/invoices/${seg(invoiceId)}/sdi-transmissions`),
  sendToSdi: (invoiceId: string) => tenantRequest<SdiTransmission>(`/invoices/${seg(invoiceId)}/sdi-transmissions`, { method: 'POST' }),
  paymentTerms: () => tenantRequest<PaymentTerms[]>('/tenants/me/payment-terms'),
  savePaymentTerms: (data: unknown, id?: string) => tenantRequest<PaymentTerms>(id ? `/tenants/me/payment-terms/${seg(id)}` : '/tenants/me/payment-terms', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }),
  deletePaymentTerms: (id: string) => tenantRequest<void>(`/tenants/me/payment-terms/${seg(id)}`, { method: 'DELETE' }),
  activateRuleSet: (id: string) => request<RuleSetSummary>(`/fiscal-rules/${seg(id)}/activate`, { method: 'POST' }),
  seedRuleSets: () => request<{ inserted: Array<{ year: number; version: number }> }>('/fiscal-rules/seed', { method: 'POST' }),
  inpsOffices: () => request<Array<{ id: string; code: string; name: string }>>('/tenants/inps-offices'),
  createTenant: (data: unknown) => request<Tenant>('/tenants', { method: 'POST', body: JSON.stringify(data) }),
  ruleSets: (year: number) => request<RuleSetSummary[]>(`/fiscal-rules/${year}`),
  ruleSet: (id: string) => request<RuleSetDetail>(`/fiscal-rules/sets/${seg(id)}`),
  /** Only the fields the web needs from the active rule set of the year. */
  activeRules: (year: number) => request<{ inps: { surchargePct: number; fullRatePct: number; reducedRatePct: number }; installments: { annualInterestPct: number; incrementPct: number } }>(`/fiscal-rules/${year}/active`),
  ruleSetStatus: (year: number) => request<{ year: number; ok: boolean; reason?: string }>(`/fiscal-rules/${year}/status`),
  /** With a selected tenant the calendar is derived from its profile and invoices (stamp duty, Intrastat). */
  deadlines: async (year: number) => {
    const tenantId = await currentTenantId();
    return request<Deadline[]>(`/fiscal-rules/${year}/deadlines?extension=true`, {}, tenantId);
  },
  customers: () => tenantRequest<Customer[]>('/customers'),
  customer: (id: string) => tenantRequest<Customer>(`/customers/${seg(id)}`),
  createCustomer: (data: unknown) => tenantRequest<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: unknown) => tenantRequest<Customer>(`/customers/${seg(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (id: string) => tenantRequest<void>(`/customers/${seg(id)}`, { method: 'DELETE' }),
  invoices: (year?: number) => tenantRequest<Invoice[]>(`/invoices${year ? `?year=${year}` : ''}`),
  invoiceYears: () => tenantRequest<number[]>('/invoices/years'),
  thresholds: () => tenantRequest<ThresholdOutlook>('/revenue-thresholds'),
  exchangeRate: (currency: string, date: string) =>
    request<{ currency: string; requestedDate: string; quotationDate: string; unitsPerEur: number; source: string }>(`/exchange-rates?currency=${encodeURIComponent(currency)}&date=${encodeURIComponent(date)}`),
  invoiceThresholds: (id: string) => tenantRequest<ThresholdOutlook>(`/invoices/${seg(id)}/thresholds`),
  invoice: (id: string) => tenantRequest<InvoiceDetail>(`/invoices/${seg(id)}`),
  createInvoice: (data: unknown) => tenantRequest<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoice: (id: string, data: unknown) => tenantRequest<Invoice>(`/invoices/${seg(id)}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInvoice: (id: string) => tenantRequest<void>(`/invoices/${seg(id)}`, { method: 'DELETE' }),
  issueInvoice: (id: string, data: unknown) => tenantRequest<Invoice>(`/invoices/${seg(id)}/issue`, { method: 'POST', body: JSON.stringify(data) }),
  collection: (invoiceId: string) => tenantRequest<InvoiceCollection>(`/invoices/${seg(invoiceId)}/collection`),
  createPayment: (invoiceId: string, data: unknown) => tenantRequest<CollectionPayment>(`/invoices/${seg(invoiceId)}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  deletePayment: (id: string) => tenantRequest<void>(`/payments/${seg(id)}`, { method: 'DELETE' }),
  taxSummary: (year: number) => tenantRequest<TaxSummary>(`/taxes/${year}/summary`),
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
  previewInvoiceImport: (files: ImportFile[]) => tenantRequest<ImportPreviewRow[]>('/invoices/import/preview', { method: 'POST', body: JSON.stringify({ files }) }),
  importInvoices: (files: ImportFile[], selected: string[]) => tenantRequest<ImportResult[]>('/invoices/import', { method: 'POST', body: JSON.stringify({ files, selected }) }),
  f24Pdf: async (id: string) => {
    const tenantId = await currentTenantId();
    const res = await fetch(`${API_URL}/f24/${seg(id)}/pdf`, { headers: tenantId ? { 'x-tenant-id': tenantId } : {}, cache: 'no-store' });
    if (!res.ok) throw new ApiError(res.status, 'PDF non disponibile');
    return { fileName: res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'f24.pdf', content: await res.arrayBuffer() };
  },
  invoicePdf: async (id: string) => {
    const tenantId = await currentTenantId();
    const res = await fetch(`${API_URL}/invoices/${seg(id)}/pdf`, { headers: tenantId ? { 'x-tenant-id': tenantId } : {}, cache: 'no-store' });
    if (!res.ok) throw new ApiError(res.status, 'PDF non disponibile');
    return { fileName: res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'fattura.pdf', content: await res.arrayBuffer() };
  },
  /** Server-Sent Events of the PEC mailbox test, passed through as they arrive; `signal` stops the test when the page leaves. */
  pecTestStream: async (signal: AbortSignal) => {
    const tenantId = await currentTenantId();
    if (!tenantId) throw new ApiError(400, 'Nessun tenant selezionato');
    const res = await fetch(`${API_URL}/sdi/pec-settings/test`, { headers: { 'x-tenant-id': tenantId, accept: 'text/event-stream' }, cache: 'no-store', signal });
    if (!res.ok || !res.body) throw new ApiError(res.status, 'Prova della connessione non disponibile');
    return res.body;
  },
  sources: () => request<SourceSummary[]>('/sources'),
  source: (id: string) => request<SourceDetail>(`/sources/${seg(id)}`),
  sourceFile: async (id: string, text: boolean) => {
    const res = await fetch(`${API_URL}/sources/${seg(id)}/file${text ? '?text=true' : ''}`, { cache: 'no-store' });
    if (!res.ok) throw new ApiError(res.status, 'File non disponibile');
    return { contentType: res.headers.get('content-type') ?? 'application/octet-stream', disposition: res.headers.get('content-disposition') ?? 'inline', content: await res.arrayBuffer() };
  },
  invoiceXml: async (id: string) => {
    const tenantId = await currentTenantId();
    const res = await fetch(`${API_URL}/invoices/${seg(id)}/xml`, { headers: tenantId ? { 'x-tenant-id': tenantId } : {}, cache: 'no-store' });
    if (!res.ok) throw new ApiError(res.status, 'XML non disponibile');
    return { fileName: res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'invoice.xml', content: await res.text() };
  },
};

