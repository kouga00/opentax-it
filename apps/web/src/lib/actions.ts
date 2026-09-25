'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { api, ApiError, SESSION_COOKIE } from './api';
import type { ImportFile, ImportPreviewRow, ImportResult } from './types';

export type ActionState = { error?: string } | undefined;

function errorMessage(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Errore inatteso';
}

async function handleActionError(e: unknown): Promise<ActionState> {
  if (e instanceof ApiError && e.status === 401) {
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    redirect('/login');
  }
  return { error: errorMessage(e) };
}

/** The session cookie is only read on the server: not readable by page scripts, HTTPS-only in production. */
const SESSION_COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 30 * 24 * 60 * 60,
} as const;

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  try {
    const res = await api.login({ email, password });
    const store = await cookies();
    store.set(SESSION_COOKIE, res.token, SESSION_COOKIE_OPTIONS);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  redirect('/dashboard');
}

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');
  const name = String(formData.get('name') ?? '').trim();

  if (password !== confirmPassword) {
    return { error: 'Le password non coincidono' };
  }

  try {
    const res = await api.register({ email, password, name: name || undefined });
    const store = await cookies();
    store.set(SESSION_COOKIE, res.token, SESSION_COOKIE_OPTIONS);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  redirect('/setup/new');
}

export async function logoutAction(): Promise<void> {
  try {
    await api.logout();
  } catch (err) {
    console.warn('Logout API call failed:', err);
  }
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/login');
}

export async function selectTenant(formData: FormData) {
  const id = String(formData.get('tenantId') ?? '');
  if (!/^[a-z0-9]{20,32}$/.test(id)) {
    redirect('/setup?error=' + encodeURIComponent('Identificativo partita IVA non valido'));
  }
  try {
    await api.selectTenant(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      const store = await cookies();
      store.delete(SESSION_COOKIE);
      redirect('/login');
    }
    redirect('/setup?error=' + encodeURIComponent(errorMessage(e)));
  }
  revalidatePath('/', 'layout');
  redirect('/invoices');
}

export async function createTenant(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  try {
    await api.createTenant({
      name: f('name'),
      businessName: f('businessName') || undefined,
      firstName: f('firstName'),
      lastName: f('lastName'),
      fiscalCode: f('fiscalCode').toUpperCase(),
      vatNumber: f('vatNumber'),
      atecoCode: f('atecoCode'),
      address: f('address'),
      postalCode: f('postalCode'),
      city: f('city'),
      province: f('province').toUpperCase(),
      activityStartYear: Number(f('activityStartYear')),
      reducedRate: formData.get('reducedRate') === 'on',
      isaSubject: formData.get('isaSubject') === 'on',
      birthDate: f('birthDate'),
      sex: f('sex').toUpperCase(),
      birthPlace: f('birthPlace'),
      birthProvince: f('birthProvince').toUpperCase(),
      applyInpsSurcharge: formData.get('applyInpsSurcharge') === 'on',
      viesRegistered: formData.get('viesRegistered') === 'on',
      revenueLimit: f('revenueLimit') ? Number(f('revenueLimit').replace(/\./g, '').replace(',', '.')) : null,
      sdiFileProgressiveStart: f('sdiFileProgressiveStart').toUpperCase() || null,
      inpsOfficeId: f('inpsOfficeId') || undefined,
      pecAddress: f('pecAddress') || undefined,
    });
  } catch (e) {
    return handleActionError(e);
  }
  redirect('/invoices');
}

export async function saveCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  const id = f('id');
  const kind = f('kind');
  const foreign = kind === 'EU' || kind === 'EU_B2C' || kind === 'NON_EU' || kind === 'NON_EU_B2C';
  const data = {
    kind,
    art7SeptiesServices: kind === 'NON_EU_B2C' && formData.get('art7SeptiesServices') === 'on',
    businessName: f('businessName') || undefined,
    firstName: f('firstName') || undefined,
    lastName: f('lastName') || undefined,
    vatNumber: f('vatNumber') || undefined,
    fiscalCode: f('fiscalCode').toUpperCase() || undefined,
    countryCode: foreign ? f('countryCode').toUpperCase() || undefined : 'IT',
    address: f('address'),
    postalCode: f('postalCode') || undefined,
    city: f('city'),
    province: foreign ? undefined : f('province').toUpperCase() || undefined,
    recipientCode: f('recipientCode').toUpperCase() || undefined,
    recipientPec: f('recipientPec') || undefined,
    currency: f('currency').toUpperCase() || undefined,
    notes: f('notes') || undefined,
  };
  try {
    if (id) await api.updateCustomer(id, data);
    else await api.createCustomer(data);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath('/customers');
  redirect('/customers');
}

export async function deleteCustomer(formData: FormData) {
  await api.deleteCustomer(String(formData.get('id')));
  revalidatePath('/customers');
}

export interface InvoiceInput {
  customerId: string;
  type: 'TD01' | 'TD04';
  refInvoiceId?: string;
  paymentTermsId?: string;
  bankAccountId?: string;
  date: string;
  applyInpsSurcharge?: boolean;
  /** EUR per unit of a foreign invoice currency. */
  exchangeRate?: number;
  lines: Array<{ description: string; quantity: number; unit?: string; unitPrice: number }>;
}

/** Creates a draft, or updates it when `id` is given (only drafts can be edited). */
export async function saveInvoice(id: string | undefined, input: InvoiceInput): Promise<{ id?: string; error?: string }> {
  try {
    const data = { ...input, refInvoiceId: input.refInvoiceId || undefined, paymentTermsId: input.paymentTermsId || undefined, bankAccountId: input.bankAccountId || undefined };
    const inv = id ? await api.updateInvoice(id, data) : await api.createInvoice(data);
    revalidatePath('/invoices');
    if (id) revalidatePath(`/invoices/${id}`);
    return { id: inv.id };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

export async function issueInvoice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get('id'));
  const dueDate = String(formData.get('dueDate') ?? '').trim();
  const iban = String(formData.get('iban') ?? '').trim();
  try {
    await api.issueInvoice(id, {
      payment: dueDate || iban ? { dueDate: dueDate || undefined, iban: iban || undefined, method: 'MP05' } : undefined,
      confirmThresholds: formData.get('confirmThresholds') === 'on',
    });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath(`/invoices/${id}`);
  revalidatePath('/invoices');
  return undefined;
}

export async function deleteInvoice(formData: FormData) {
  await api.deleteInvoice(String(formData.get('id')));
  revalidatePath('/invoices');
  redirect('/invoices');
}

export async function updateTenantProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  try {
    await api.updateMe({
      name: f('name') || undefined,
      businessName: f('businessName') || undefined,
      firstName: f('firstName') || undefined,
      lastName: f('lastName') || undefined,
      fiscalCode: f('fiscalCode').toUpperCase() || undefined,
      vatNumber: f('vatNumber') || undefined,
      atecoCode: f('atecoCode') || undefined,
      address: f('address') || undefined,
      postalCode: f('postalCode') || undefined,
      city: f('city') || undefined,
      province: f('province').toUpperCase() || undefined,
      activityStartYear: f('activityStartYear') ? Number(f('activityStartYear')) : undefined,
      reducedRate: formData.get('reducedRate') === 'on',
      isaSubject: formData.get('isaSubject') === 'on',
      birthDate: f('birthDate'),
      sex: f('sex').toUpperCase(),
      birthPlace: f('birthPlace'),
      birthProvince: f('birthProvince').toUpperCase(),
      applyInpsSurcharge: formData.get('applyInpsSurcharge') === 'on',
      viesRegistered: formData.get('viesRegistered') === 'on',
      revenueLimit: f('revenueLimit') ? Number(f('revenueLimit').replace(/\./g, '').replace(',', '.')) : null,
      sdiFileProgressiveStart: f('sdiFileProgressiveStart').toUpperCase() || null,
      pecAddress: f('pecAddress') || undefined,
      inpsOfficeId: f('inpsOfficeId'),
    });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath('/setup');
  return undefined;
}

export async function activateRuleSet(formData: FormData) {
  await api.activateRuleSet(String(formData.get('id')));
  revalidatePath('/rules');
  revalidatePath('/sources', 'layout');
  revalidatePath('/setup');
  revalidatePath('/dashboard');
  revalidatePath('/deadlines');
}

export async function seedRuleSets() {
  await api.seedRuleSets();
  revalidatePath('/rules');
}

export async function addPayment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const invoiceId = String(formData.get('invoiceId'));
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  try {
    await api.createPayment(invoiceId, {
      date: f('date'),
      amount: Number(f('amount').replace(',', '.')),
      // ECB quote "1 EUR = X units" on the collection day → EUR per unit (TUIR art. 9 par. 2).
      exchangeRate: f('ecbRate') ? Math.round((1 / Number(f('ecbRate').replace(',', '.'))) * 1e6) / 1e6 : undefined,
      method: f('method') || undefined,
      notes: f('notes') || undefined,
    });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath('/dashboard');
  revalidatePath('/taxes');
  return undefined;
}

export async function deletePayment(formData: FormData) {
  await api.deletePayment(String(formData.get('id')));
  revalidatePath(`/invoices/${String(formData.get('invoiceId'))}`);
  revalidatePath('/dashboard');
  revalidatePath('/taxes');
}

export async function saveTaxYearData(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const year = Number(formData.get('year'));
  const num = (k: string) => Number(String(formData.get(k) ?? '0').replace(',', '.')) || 0;
  try {
    await api.updateTaxYearData(year, {
      contributionsPaid: num('contributionsPaid'),
      taxAdvancesPaid: num('taxAdvancesPaid'),
      inpsAdvancesPaid: num('inpsAdvancesPaid'),
      taxCredits: num('taxCredits'),
      inpsReducedRate: formData.get('inpsReducedRate') === 'on',
    });
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath('/taxes');
  revalidatePath('/dashboard');
  return undefined;
}

/** Same limits as the API: at most 200 files of 20 MB each. */
const MAX_IMPORT_FILES = 200;
const MAX_IMPORT_FILE_BYTES = 20 * 1024 * 1024;

async function importFilesFrom(formData: FormData): Promise<ImportFile[]> {
  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) throw new Error('Scegli almeno un file .xml o .zip');
  if (files.length > MAX_IMPORT_FILES) throw new Error(`Al massimo ${MAX_IMPORT_FILES} file per volta`);
  const tooLarge = files.find((f) => f.size > MAX_IMPORT_FILE_BYTES);
  if (tooLarge) throw new Error(`${tooLarge.name} supera 20 MB: dividilo in archivi più piccoli`);
  return Promise.all(files.map(async (f) => ({ name: f.name, contentBase64: Buffer.from(await f.arrayBuffer()).toString('base64') })));
}

/** First step of the import: what would happen, without writing anything. */
export async function previewInvoiceImport(formData: FormData): Promise<{ rows?: ImportPreviewRow[]; error?: string }> {
  try {
    return { rows: await api.previewInvoiceImport(await importFilesFrom(formData)) };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Errore inatteso' };
  }
}

/** Second step: the same files again, with the preview rows chosen by the user in "selected". */
export async function importInvoiceFiles(formData: FormData): Promise<{ results?: ImportResult[]; error?: string }> {
  try {
    const selected = formData.getAll('selected').map(String);
    const results = await api.importInvoices(await importFilesFrom(formData), selected);
    revalidatePath('/invoices');
    revalidatePath('/customers');
    revalidatePath('/dashboard');
    revalidatePath('/deadlines');
    return { results };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Errore inatteso' };
  }
}

export async function saveBankAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  try {
    await api.saveBankAccount(
      { name: f('name'), bankName: f('bankName') || undefined, iban: f('iban').replace(/\s+/g, '').toUpperCase(), bic: f('bic').toUpperCase() || undefined, isDefault: formData.get('isDefault') === 'on' },
      f('id') || undefined,
    );
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath('/banks');
  redirect('/banks');
}

export async function deleteBankAccount(formData: FormData) {
  await api.deleteBankAccount(String(formData.get('id')));
  revalidatePath('/banks');
}

export async function savePaymentTerms(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  try {
    await api.savePaymentTerms({ name: f('name'), days: Number(f('days')), method: f('method') || 'MP05', isDefault: formData.get('isDefault') === 'on' }, f('id') || undefined);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath('/payment-terms');
  redirect('/payment-terms');
}

export async function deletePaymentTerms(formData: FormData) {
  await api.deletePaymentTerms(String(formData.get('id')));
  revalidatePath('/payment-terms');
}

export async function createPlan(formData: FormData) {
  const taxYear = Number(formData.get('taxYear'));
  try {
    await api.createPlan(taxYear, {
      start: String(formData.get('start')),
      installments: Number(formData.get('installments')),
      useCredits: formData.get('useCredits') === 'on' || formData.get('useCredits') === 'true',
      creditOrder: String(formData.get('creditOrder') || 'INPS_FIRST'),
    });
  } catch (e) {
    redirect(`/f24?year=${taxYear}&error=${encodeURIComponent(errorMessage(e))}`);
  }
  revalidatePath('/f24');
  revalidatePath('/dashboard');
  redirect(`/f24?year=${taxYear}`);
}

export async function deletePlan(formData: FormData) {
  const taxYear = Number(formData.get('taxYear'));
  try {
    await api.deletePlan(taxYear);
  } catch (e) {
    redirect(`/f24?year=${taxYear}&error=${encodeURIComponent(errorMessage(e))}`);
  }
  revalidatePath('/f24');
  revalidatePath('/dashboard');
  redirect(`/f24?year=${taxYear}`);
}

export async function setF24Status(formData: FormData) {
  const id = String(formData.get('id'));
  const taxYear = Number(formData.get('taxYear'));
  const status = String(formData.get('status'));
  const paidOn = String(formData.get('paidOn') ?? '');
  try {
    await api.updateF24Status(id, { status, paidOn: paidOn || undefined });
  } catch (e) {
    redirect(`/f24?year=${taxYear}&error=${encodeURIComponent(errorMessage(e))}`);
  }
  revalidatePath('/f24');
  revalidatePath('/dashboard');
}

export async function saveTaxCredit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  try {
    await api.saveTaxCredit({
      section: f('section'),
      code: f('code').toUpperCase(),
      referenceYear: Number(f('referenceYear')),
      amount: Number(f('amount').replace(',', '.')),
      localCode: f('localCode').toUpperCase() || undefined,
      installmentCode: f('installmentCode') || undefined,
      usableFrom: f('usableFrom') || undefined,
      description: f('description') || undefined,
    }, f('id') || undefined);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath('/credits');
  revalidatePath('/f24');
  redirect('/credits');
}

export async function deleteTaxCredit(formData: FormData) {
  const id = String(formData.get('id'));
  try {
    await api.deleteTaxCredit(id);
  } catch (e) {
    redirect(`/credits?error=${encodeURIComponent(errorMessage(e))}`);
  }
  revalidatePath('/credits');
  revalidatePath('/f24');
}

/** Reference exchange rate for a day ("1 EUR = X units", Banca d'Italia), to prefill the forms. */
export async function getExchangeRate(currency: string, date: string): Promise<{ unitsPerEur: number; quotationDate: string; source: string } | { error: string }> {
  try {
    const r = await api.exchangeRate(currency, date);
    return { unitsPerEur: r.unitsPerEur, quotationDate: r.quotationDate, source: r.source };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
