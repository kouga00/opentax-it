/** Payment data of a document: method, bank and one entry per installment (DettaglioPagamento). */
export interface CourtesyInvoicePayment {
  method?: string;
  /** Due date and amount of each installment; several under TP01 ("pagamento a rate"). */
  installments: Array<{ dueDate?: string; amount: number }>;
  iban?: string;
  bic?: string;
}
