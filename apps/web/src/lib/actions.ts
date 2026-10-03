'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { api, ApiError, SESSION_COOKIE } from './api';
import type { ImportFile, PecProbeStatus, ImportPreviewRow, ImportResult, InvoiceCollection } from './types';

export type ActionState = { error?: string } | undefined;

function errorMessage(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Errore inatteso';
}

async function handleActionError<T = ActionState>(e: unknown, onError?: (msg: string) => T | never): Promise<T> {
  if (e instanceof ApiError && e.status === 401) {
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    redirect('/login');
  }
  if (onError) {
    return onError(errorMessage(e));
  }
  return { error: errorMessage(e) } as T;
}

/** Back to a page with the API message in ?error=, for form actions that have no state to return it in. */
function failTo(path: string) {
  return (msg: string): never => redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(msg)}`);
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
    return handleActionError(e, (msg) => redirect('/setup?error=' + encodeURIComponent(msg)));
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
      socialSecurityScheme: f('socialSecurityScheme') || undefined,
      ...professionalFund(formData),
      inpsFlatRateReduction: formData.get('inpsFlatRateReduction') === 'on',
      inpsSeniorityBefore1996: formData.get('inpsSeniorityBefore1996') === 'on',
      applyInpsSurcharge: formData.get('applyInpsSurcharge') === 'on',
      viesRegistered: formData.get('viesRegistered') === 'on',
      revenueLimit: f('revenueLimit') ? Number(f('revenueLimit').replace(/\./g, '').replace(',', '.')) : null,
      sdiFileProgressiveStart: f('sdiFileProgressiveStart').toUpperCase() || null,
      inpsOfficeId: f('inpsOfficeId') || undefined,
    });
  } catch (e) {
    return handleActionError(e);
  }
  revalidatePath('/', 'layout');
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
    return handleActionError(e);
  }
  revalidatePath('/customers');
  redirect('/customers');
}

export async function deleteCustomer(formData: FormData) {
  try {
    await api.deleteCustomer(String(formData.get('id')));
  } catch (e) {
    return handleActionError(e, failTo('/customers'));
  }
  revalidatePath('/customers');
}

export interface InvoiceInput {
  customerId: string;
  type: 'TD01' | 'TD04';
  refInvoiceId?: string;
  paymentTermsId?: string;
  bankAccountId?: string;
  /** ModalitaPagamento, e.g. MP05. */
  paymentMethod?: string;
  date: string;
  applyInpsSurcharge?: boolean;
  applyProfessionalFund?: boolean;
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
    return handleActionError(e);
  }
}

export async function issueInvoice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get('id'));
  const dueDate = String(formData.get('dueDate') ?? '').trim();
  const iban = String(formData.get('iban') ?? '').trim();
  try {
    await api.issueInvoice(id, {
      // The method is the one chosen on the draft: here only due date and IBAN can change.
      payment: dueDate || iban ? { dueDate: dueDate || undefined, iban: iban || undefined } : undefined,
      confirmThresholds: formData.get('confirmThresholds') === 'on',
    });
  } catch (e) {
    return handleActionError(e);
  }
  revalidatePath(`/invoices/${id}`);
  revalidatePath('/invoices');
  return undefined;
}

/** Reopens an invoice rejected by SDI as a draft with the same number and date, and opens it for editing. */
export async function reopenInvoiceForCorrection(formData: FormData) {
  const id = String(formData.get('id'));
  try {
    await api.reopenInvoiceForCorrection(id);
  } catch (e) {
    return handleActionError(e, failTo(`/invoices/${id}`));
  }
  revalidatePath('/invoices');
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}/edit`);
}

/** Creates a draft that replaces an invoice rejected by SDI with a new number and date, and opens it for editing. */
export async function replaceRejectedInvoice(formData: FormData) {
  const id = String(formData.get('id'));
  let draftId: string;
  try {
    const draft = await api.createInvoiceReplacement(id);
    draftId = draft.id;
    revalidatePath('/invoices');
    revalidatePath(`/invoices/${id}`);
  } catch (e) {
    return handleActionError(e, failTo(`/invoices/${id}`));
  }
  redirect(`/invoices/${draftId}/edit`);
}

export async function deleteInvoice(formData: FormData) {
  const id = String(formData.get('id'));
  try {
    await api.deleteInvoice(id);
  } catch (e) {
    return handleActionError(e, failTo(`/invoices/${id}`));
  }
  revalidatePath('/invoices');
  revalidatePath('/dashboard');
  // Also from the draft page, which no longer exists.
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
      socialSecurityScheme: f('socialSecurityScheme') || undefined,
      ...professionalFund(formData),
      inpsFlatRateReduction: formData.get('inpsFlatRateReduction') === 'on',
      inpsSeniorityBefore1996: formData.get('inpsSeniorityBefore1996') === 'on',
      applyInpsSurcharge: formData.get('applyInpsSurcharge') === 'on',
      viesRegistered: formData.get('viesRegistered') === 'on',
      revenueLimit: f('revenueLimit') ? Number(f('revenueLimit').replace(/\./g, '').replace(',', '.')) : null,
      sdiFileProgressiveStart: f('sdiFileProgressiveStart').toUpperCase() || null,
      inpsOfficeId: f('inpsOfficeId'),
    });
  } catch (e) {
    return handleActionError(e);
  }
  revalidatePath('/setup');
  return undefined;
}

/** Back to the rules page of a year, with the outcome of a load or an activation. */
function rulesRedirect(year: string, key: 'error' | 'notice', message: string): never {
  redirect(`/rules?year=${encodeURIComponent(year)}&${key}=${encodeURIComponent(message)}`);
}

/** Loading and activating rule sets is for platform admins (fiscal-rules.controller.ts, @Roles). */
const rulesErrorMessage = (e: unknown, msg: string) =>
  e instanceof ApiError && e.status === 403 ? 'Solo un amministratore può caricare e attivare le regole fiscali.' : msg;

export async function activateRuleSet(formData: FormData) {
  const year = String(formData.get('year') ?? '');
  try {
    await api.activateRuleSet(String(formData.get('id')));
  } catch (e) {
    return handleActionError(e, (msg) => rulesRedirect(year, 'error', rulesErrorMessage(e, msg)));
  }
  revalidatePath('/rules');
  revalidatePath('/sources', 'layout');
  revalidatePath('/setup');
  revalidatePath('/dashboard');
  revalidatePath('/deadlines');
  rulesRedirect(year, 'notice', `Set di regole ${year} attivato.`);
}

export async function seedRuleSets(formData: FormData) {
  const year = String(formData.get('year') ?? '');
  let inserted: Array<{ year: number; version: number }>;
  try {
    ({ inserted } = await api.seedRuleSets());
  } catch (e) {
    return handleActionError(e, (msg) => rulesRedirect(year, 'error', rulesErrorMessage(e, msg)));
  }
  revalidatePath('/rules');
  const forYear = inserted.filter((s) => String(s.year) === year);
  const others = inserted.filter((s) => String(s.year) !== year).map((s) => `${s.year} v${s.version}`);
  const notice = forYear.length > 0
    ? `Caricata la bozza ${year} v${forYear[0].version}: controllala e attivala.`
    : `Nessun set nuovo per il ${year}: l'applicazione non ne contiene uno diverso da quelli già caricati${Number(year) > new Date().getFullYear() ? ' (le regole di un anno arrivano con un aggiornamento dopo la pubblicazione della normativa)' : ''}.`;
  rulesRedirect(year, 'notice', others.length > 0 ? `${notice} Caricate anche le bozze ${others.join(', ')}.` : notice);
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
    return handleActionError(e);
  }
  revalidatePath('/invoices');
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath('/dashboard');
  revalidatePath('/taxes');
  return undefined;
}

/** Total, collected and remaining of an invoice, for the dialog that records a collection from the invoice list. */
export async function getInvoiceCollection(invoiceId: string): Promise<{ collection: InvoiceCollection } | { error: string }> {
  try {
    return { collection: await api.collection(invoiceId) };
  } catch (e) {
    return handleActionError(e);
  }
}

export async function deletePayment(formData: FormData) {
  try {
    await api.deletePayment(String(formData.get('id')));
  } catch (e) {
    return handleActionError(e, failTo(`/invoices/${String(formData.get('invoiceId'))}`));
  }
  revalidatePath('/invoices');
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
      // INPS Artigiani/Commercianti codes, only when the form shows them.
      ...(formData.has('inpsExcessCode')
        ? { inpsFixedCodes: formData.getAll('inpsFixedCodes').map((c) => String(c).trim()), inpsExcessCode: String(formData.get('inpsExcessCode')).trim() || null }
        : {}),
    });
  } catch (e) {
    return handleActionError(e);
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
export async function previewImport(formData: FormData): Promise<{ rows?: ImportPreviewRow[]; error?: string }> {
  try {
    return { rows: await api.previewImport(await importFilesFrom(formData)) };
  } catch (e) {
    return handleActionError(e);
  }
}

/** Second step: the same files again, with the preview rows chosen by the user in "selected". */
export async function importDocuments(formData: FormData): Promise<{ results?: ImportResult[]; error?: string }> {
  try {
    const selected = formData.getAll('selected').map(String);
    const results = await api.importDocuments(await importFilesFrom(formData), selected);
    revalidatePath('/invoices');
    revalidatePath('/customers');
    revalidatePath('/dashboard');
    revalidatePath('/deadlines');
    return { results };
  } catch (e) {
    return handleActionError(e);
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
    return handleActionError(e);
  }
  revalidatePath('/banks');
  redirect('/banks');
}

export async function deleteBankAccount(formData: FormData) {
  try {
    await api.deleteBankAccount(String(formData.get('id')));
  } catch (e) {
    return handleActionError(e, failTo('/banks'));
  }
  revalidatePath('/banks');
}

export async function savePaymentTerms(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  try {
    // "30, 60, 90" or "30/60/90": the days of each installment.
    const dueDays = f('dueDays').split(/[,/\s]+/).filter(Boolean).map(Number);
    await api.savePaymentTerms({ name: f('name'), dueDays, fromMonthEnd: formData.get('fromMonthEnd') === 'on', method: f('method') || 'MP05', isDefault: formData.get('isDefault') === 'on' }, f('id') || undefined);
  } catch (e) {
    return handleActionError(e);
  }
  revalidatePath('/payment-terms');
  redirect('/payment-terms');
}

export async function deletePaymentTerms(formData: FormData) {
  try {
    await api.deletePaymentTerms(String(formData.get('id')));
  } catch (e) {
    return handleActionError(e, failTo('/payment-terms'));
  }
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
    return handleActionError(e, (msg) => redirect(`/f24?year=${taxYear}&error=${encodeURIComponent(msg)}`));
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
    return handleActionError(e, (msg) => redirect(`/f24?year=${taxYear}&error=${encodeURIComponent(msg)}`));
  }
  revalidatePath('/f24');
  revalidatePath('/dashboard');
  redirect(`/f24?year=${taxYear}`);
}

/** Marks an F24 as paid from its dialog, with the payment date and how it was paid. */
export async function markF24Paid(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  try {
    await api.updateF24Status(f('id'), { status: 'PAID', paidOn: f('paidOn') || undefined, notes: f('notes') || undefined });
  } catch (e) {
    return handleActionError(e);
  }
  revalidatePath('/f24');
  revalidatePath('/dashboard');
  revalidatePath('/taxes');
  return undefined;
}

export async function setF24Status(formData: FormData) {
  const id = String(formData.get('id'));
  const taxYear = Number(formData.get('taxYear'));
  const status = String(formData.get('status'));
  const paidOn = String(formData.get('paidOn') ?? '');
  try {
    await api.updateF24Status(id, { status, paidOn: paidOn || undefined });
  } catch (e) {
    return handleActionError(e, (msg) => redirect(`/f24?year=${taxYear}&error=${encodeURIComponent(msg)}`));
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
    return handleActionError(e);
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
    return handleActionError(e, (msg) => redirect(`/credits?error=${encodeURIComponent(msg)}`));
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
    return handleActionError(e);
  }
}

export async function savePecSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  const other = f('provider') === 'OTHER';
  try {
    await api.savePecSettings({
      provider: f('provider'),
      address: f('address'),
      username: f('username') || undefined,
      // An empty field keeps the stored password.
      password: String(formData.get('password') ?? '') || undefined,
      smtpHost: other ? f('smtpHost') : undefined,
      smtpPort: other ? Number(f('smtpPort')) : undefined,
      imapHost: other ? f('imapHost') : undefined,
      imapPort: other ? Number(f('imapPort')) : undefined,
      sdiPecAssigned: f('sdiPecAssigned') || null,
    });
  } catch (e) {
    return handleActionError(e);
  }
  revalidatePath('/setup');
  return undefined;
}

export async function sendToSdi(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get('id'));
  let error: string | undefined;
  try {
    await api.sendToSdi(id);
  } catch (e) {
    await handleActionError(e);
    error = errorMessage(e);
  }
  // Also after a failure: the page shows the failed transmission with its reason.
  revalidatePath(`/invoices/${id}`);
  revalidatePath('/invoices');
  revalidatePath('/dashboard');
  return error ? { error } : undefined;
}

export type ReceiptsState = { error?: string; message?: string } | undefined;

/** Reads the new messages of the PEC mailbox and updates the transmissions (the mailbox is not modified). */
export async function syncReceipts(_prev: ReceiptsState, formData: FormData): Promise<ReceiptsState> {
  const id = String(formData.get('id') ?? '');
  try {
    const r = await api.syncReceipts();
    if (id) revalidatePath(`/invoices/${id}`);
    revalidatePath('/invoices');
    revalidatePath('/dashboard');
    // The reading time and the assigned SDI address learned from the receipts are shown in the settings.
    revalidatePath('/setup');
    if (r.status === 'BUSY') return { message: 'Un controllo delle ricevute è già in corso: riprova tra poco.' };
    if (r.status !== 'DONE') return { error: r.message ?? 'Controllo delle ricevute non riuscito.' };
    if (r.read === 0) return { message: 'Nessun nuovo messaggio nella casella PEC.' };
    return { message: `Letti ${r.read} nuovi messaggi, ${r.matched} relativi agli invii allo SDI.` };
  } catch (e) {
    return handleActionError(e);
  }
}

export type PecProbeState = { error?: string; status?: PecProbeStatus } | undefined;

/** Sends the test PEC without attachment to SDI (a real message, no invoice). */
export async function sendPecProbe(): Promise<PecProbeState> {
  try {
    // No revalidation: the probe card keeps the returned status, and the settings page reads it again on the next visit.
    return { status: await api.sendPecProbe() };
  } catch (e) {
    return handleActionError(e);
  }
}

/** Reads the mailbox for the replies to the last test PEC. */
export async function checkPecProbe(): Promise<PecProbeState> {
  try {
    return { status: await api.pecProbeStatus() };
  } catch (e) {
    return handleActionError(e);
  }
}

/** Professional fund fields of the profile form: sent only when shown (scheme PROFESSIONAL_FUND); empty values remove them. */
function professionalFund(formData: FormData) {
  if (!formData.has('professionalFundType')) return {};
  const rate = String(formData.get('professionalFundRatePct') ?? '').trim().replace(',', '.');
  return { professionalFundType: String(formData.get('professionalFundType')) || null, professionalFundRatePct: rate ? Number(rate) : null };
}

/** The four F24 forms of the INPS Artigiani/Commercianti fixed installments of a year. */
export async function createFixedContributions(formData: FormData) {
  const taxYear = Number(formData.get('taxYear'));
  const year = Number(formData.get('year'));
  try {
    await api.createFixedContributions(year);
  } catch (e) {
    return handleActionError(e, failTo(`/f24?year=${taxYear}`));
  }
  revalidatePath('/f24');
  revalidatePath('/dashboard');
  redirect(`/f24?year=${taxYear}`);
}

/** An F24 of contribution rows entered by hand (INPS Artigiani/Commercianti, professional funds). */
export async function createContributionF24(data: unknown): Promise<{ error?: string }> {
  try {
    await api.createContributionF24(data);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  revalidatePath('/f24');
  revalidatePath('/dashboard');
  return {};
}

export async function deleteF24(formData: FormData) {
  const taxYear = Number(formData.get('taxYear'));
  try {
    await api.deleteF24(String(formData.get('id')));
  } catch (e) {
    return handleActionError(e, failTo(`/f24?year=${taxYear}`));
  }
  revalidatePath('/f24');
  revalidatePath('/dashboard');
  redirect(`/f24?year=${taxYear}`);
}

/** Marks the return of a year as filed: the API registers the credits it gives (RX31, RR8) in the credit registry. */
export async function fileReturn(formData: FormData) {
  const year = Number(formData.get('year'));
  try {
    await api.fileReturn(year, String(formData.get('filedOn') ?? ''));
  } catch (e) {
    return handleActionError(e, failTo(`/taxes/return?year=${year}`));
  }
  revalidatePath('/taxes/return');
  revalidatePath('/credits');
  redirect(`/taxes/return?year=${year}`);
}

export async function unfileReturn(formData: FormData) {
  const year = Number(formData.get('year'));
  try {
    await api.unfileReturn(year);
  } catch (e) {
    return handleActionError(e, failTo(`/taxes/return?year=${year}`));
  }
  revalidatePath('/taxes/return');
  revalidatePath('/credits');
  redirect(`/taxes/return?year=${year}`);
}

/** Pages that show the stamp duty quarters or their forms. */
function revalidateStampDuty() {
  for (const path of ['/stamp-duty', '/f24', '/deadlines', '/dashboard']) revalidatePath(path);
}

/** The F24 of a stamp duty quarter with the amount the AdE shows on the portal. */
export async function createStampDutyF24(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  try {
    await api.createStampDutyF24(Number(f('year')), Number(f('quarter')), { amount: Number(f('amount').replace(',', '.')), paymentDate: f('paymentDate') || undefined });
  } catch (e) {
    return handleActionError(e);
  }
  revalidateStampDuty();
  return undefined;
}

/** A stamp duty quarter paid with the debit from the "Fatture e corrispettivi" portal. */
export async function markStampDutyPaid(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  try {
    await api.markStampDutyPaid(Number(f('year')), Number(f('quarter')), { amount: Number(f('amount').replace(',', '.')), paidOn: f('paidOn') });
  } catch (e) {
    return handleActionError(e);
  }
  revalidateStampDuty();
  return undefined;
}

export async function unmarkStampDutyPaid(formData: FormData) {
  const year = Number(formData.get('year'));
  try {
    await api.unmarkStampDutyPaid(year, Number(formData.get('quarter')));
  } catch (e) {
    return handleActionError(e, failTo(`/stamp-duty?year=${year}`));
  }
  revalidateStampDuty();
}

/** Creates a user with the password chosen by the platform admin. */
export async function createUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  let id: string;
  try {
    id = (await api.createUser({ email: f('email'), name: f('name') || undefined, password: String(formData.get('password') ?? ''), role: f('role') })).id;
  } catch (e) {
    return handleActionError(e);
  }
  revalidatePath('/users');
  redirect(`/users/${id}`);
}

/** Name, role and, when filled in, a new password (which closes the user's sessions). */
export async function updateUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const f = (k: string) => String(formData.get(k) ?? '').trim();
  const password = String(formData.get('password') ?? '');
  try {
    await api.updateUser(f('id'), { name: f('name'), role: f('role'), ...(password ? { password } : {}) });
  } catch (e) {
    return handleActionError(e);
  }
  revalidatePath('/users');
  redirect('/users');
}

/** The VAT numbers the user can access: one select per VAT number ("" = no access). */
export async function saveUserMemberships(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const memberships = [...formData.entries()]
    .filter(([key, value]) => key.startsWith('access:') && value !== '')
    .map(([key, value]) => ({ tenantId: key.slice('access:'.length), role: String(value) }));
  try {
    await api.setUserMemberships(String(formData.get('id')), memberships);
  } catch (e) {
    return handleActionError(e);
  }
  revalidatePath('/users');
  redirect('/users');
}

export async function deleteUser(formData: FormData) {
  try {
    await api.deleteUser(String(formData.get('id')));
  } catch (e) {
    return handleActionError(e, failTo('/users'));
  }
  revalidatePath('/users');
}
