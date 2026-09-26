import type { ThresholdOutlook } from '@opentax-it/fiscal-rules';
import type { Customer, Invoice, InvoiceLine } from '../generated/prisma/client.js';
import { InvoiceCustomerDto } from './dto/response/invoice-customer.dto.js';
import { InvoiceDetailDto } from './dto/response/invoice-detail.dto.js';
import { InvoiceLineResponseDto } from './dto/response/invoice-line.dto.js';
import { InvoiceDto } from './dto/response/invoice.dto.js';
import { ThresholdOutlookDto } from './dto/response/threshold-outlook.dto.js';

/**
 * Builds the invoice responses field by field: Decimals become numbers, the date YYYY-MM-DD; the tenant id,
 * the storage path of the XML and the customer's other data stay out.
 */

type CustomerSummary = Pick<Customer, 'id' | 'kind' | 'businessName' | 'firstName' | 'lastName'>;

const toCustomerDto = (c: CustomerSummary): InvoiceCustomerDto =>
  Object.assign(new InvoiceCustomerDto(), { id: c.id, kind: c.kind, businessName: c.businessName, firstName: c.firstName, lastName: c.lastName });

function fields(i: Invoice & { customer: CustomerSummary }) {
  return {
    id: i.id,
    type: i.type,
    year: i.year,
    number: i.number,
    date: i.date.toISOString().slice(0, 10),
    currency: i.currency,
    exchangeRate: Number(i.exchangeRate),
    vatNature: i.vatNature,
    taxableAmount: Number(i.taxableAmount),
    inpsSurcharge: Number(i.inpsSurcharge),
    virtualStamp: i.virtualStamp,
    stampAmount: Number(i.stampAmount),
    total: Number(i.total),
    notes: i.notes,
    status: i.status,
    refInvoiceId: i.refInvoiceId,
    paymentTermsId: i.paymentTermsId,
    bankAccountId: i.bankAccountId,
    paymentMethod: i.paymentMethod,
    xmlFileName: i.xmlFileName,
    internalNotes: i.internalNotes,
    customer: toCustomerDto(i.customer),
  };
}

export const toInvoiceDto = (i: Invoice & { customer: CustomerSummary }): InvoiceDto => Object.assign(new InvoiceDto(), fields(i));

export function toInvoiceDetailDto(i: Invoice & { customer: CustomerSummary; lines: InvoiceLine[] }): InvoiceDetailDto {
  return Object.assign(new InvoiceDetailDto(), fields(i), {
    lines: i.lines.map((l) =>
      Object.assign(new InvoiceLineResponseDto(), {
        lineNumber: l.lineNumber,
        description: l.description,
        quantity: Number(l.quantity),
        unit: l.unit,
        unitPrice: Number(l.unitPrice),
        totalPrice: Number(l.totalPrice),
      }),
    ),
  });
}

export function toThresholdOutlookDto(t: ThresholdOutlook): ThresholdOutlookDto {
  return Object.assign(new ThresholdOutlookDto(), {
    collectedRevenue: t.collectedRevenue,
    accessThreshold: t.accessThreshold,
    exitThreshold: t.exitThreshold,
    exceedsAccessThreshold: t.exceedsAccessThreshold,
    exceedsExitThreshold: t.exceedsExitThreshold,
    outstanding: t.outstanding,
    invoiceTotal: t.invoiceTotal,
    projected: t.projected,
    accessLevel: t.accessLevel,
    exitLevel: t.exitLevel,
    personalLimit: t.personalLimit,
    projectedOverExit: t.projectedOverExit,
    projectedOverPersonalLimit: t.projectedOverPersonalLimit,
  });
}
