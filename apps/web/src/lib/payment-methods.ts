/**
 * ModalitaPagamento offered in the forms (FatturaPA specifications 1.9.1, DettaglioPagamento; the full list is in
 * packages/fatturapa, payment-methods.ts). Imported invoices may carry other codes: they are shown as they are.
 */
export const PAYMENT_METHOD_OPTIONS: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'MP05', label: 'Bonifico' },
  { code: 'MP08', label: 'Carta di pagamento' },
  { code: 'MP19', label: 'SEPA Direct Debit' },
  { code: 'MP01', label: 'Contanti' },
];

/** "Bonifico (MP05)"; an unknown code as it is, and a dash when missing. */
export function paymentMethodLabel(code: string | null | undefined): string {
  if (!code) return '—';
  const option = PAYMENT_METHOD_OPTIONS.find((o) => o.code === code);
  return option ? `${option.label} (${code})` : code;
}

/** Methods paid into the supplier's account: only these put the bank (IBAN) in the invoice. Same rule as the API. */
export const usesBankAccount = (code: string) => code === 'MP05' || code === 'MP19';
