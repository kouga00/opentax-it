/**
 * ModalitaPagamento codes and their descriptions, as listed in the FatturaPA technical specifications
 * (Allegato A, version 1.9.1, DettaglioPagamento).
 */
export const PAYMENT_METHODS: Readonly<Record<string, string>> = {
  MP01: 'contanti',
  MP02: 'assegno',
  MP03: 'assegno circolare',
  MP04: 'contanti presso Tesoreria',
  MP05: 'bonifico',
  MP06: 'vaglia cambiario',
  MP07: 'bollettino bancario',
  MP08: 'carta di pagamento',
  MP09: 'RID',
  MP10: 'RID utenze',
  MP11: 'RID veloce',
  MP12: 'Riba',
  MP13: 'MAV',
  MP14: 'quietanza erario stato',
  MP15: 'giroconto su conti di contabilità speciale',
  MP16: 'domiciliazione bancaria',
  MP17: 'domiciliazione postale',
  MP18: 'bollettino di c/c postale',
  MP19: 'SEPA Direct Debit',
  MP20: 'SEPA Direct Debit CORE',
  MP21: 'SEPA Direct Debit B2B',
  MP22: 'Trattenuta su somme già riscosse',
  MP23: 'PagoPA',
};

/** "Bonifico (MP05)"; an unknown code is returned as it is. */
export function paymentMethodLabel(code: string): string {
  const description = PAYMENT_METHODS[code];
  return description ? `${description.charAt(0).toUpperCase()}${description.slice(1)} (${code})` : code;
}
