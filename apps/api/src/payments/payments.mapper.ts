import type { Payment } from '../generated/prisma/client.js';
import { InvoiceCollectionDto } from './dto/response/invoice-collection.dto.js';
import { PaymentDto } from './dto/response/payment.dto.js';
import type { InvoiceCollection } from './types/invoice-collection.js';

/** Builds the response DTOs of collections field by field: Prisma Decimals become numbers, tenant and invoice ids stay out. */

export function toPaymentDto(p: Payment): PaymentDto {
  return Object.assign(new PaymentDto(), {
    id: p.id,
    date: p.date.toISOString().slice(0, 10),
    amount: Number(p.amount),
    amountEur: Number(p.amountEur),
    exchangeRate: Number(p.exchangeRate),
    method: p.method,
    notes: p.notes,
  });
}

export function toInvoiceCollectionDto(c: InvoiceCollection): InvoiceCollectionDto {
  return Object.assign(new InvoiceCollectionDto(), {
    invoiceId: c.invoiceId,
    currency: c.currency,
    total: c.total,
    refund: c.refund,
    collected: c.collected,
    remaining: c.remaining,
    paymentMethod: c.paymentMethod,
    payments: c.payments.map(toPaymentDto),
  });
}
