import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreatePaymentDto } from '../dto/request/create-payment.dto.js';
import type { InvoiceCollection } from '../types/invoice-collection.js';

/**
 * Collections on invoices. Cash basis (L. 190/2014 art. 1 par. 64; Istr. LM section III):
 * revenue belongs to the year in which it is collected, whatever the invoice date.
 */
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** What an issued document asks, what was collected and what is left, in the document currency. */
  async collection(tenantId: string, invoiceId: string): Promise<InvoiceCollection> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { payments: { orderBy: { date: 'asc' } } },
    });
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);
    // A credit note is settled by refunds, recorded as negative collections: count them as positive.
    const refund = invoice.type === 'TD04';
    const recorded = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
    const collected = round2(refund ? -recorded : recorded);
    const total = Number(invoice.total);
    return {
      invoiceId: invoice.id,
      currency: invoice.currency,
      total,
      refund,
      collected,
      remaining: round2(total - collected),
      paymentMethod: invoice.paymentMethod,
      payments: invoice.payments,
    };
  }

  async create(tenantId: string, invoiceId: string, dto: CreatePaymentDto) {
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException(`Invoice ${invoiceId} not found`);
    if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED') throw new BadRequestException('Collections can be recorded only on issued invoices');
    // Income in foreign currency is valued at the rate of the day it is collected (TUIR art. 9 par. 2:
    // "secondo il cambio del giorno in cui sono stati percepiti … o del giorno antecedente più prossimo"),
    // not at the invoice rate: for non-EUR invoices the collection needs its own rate or EUR amount.
    const foreign = invoice.currency !== 'EUR';
    const exchangeRate = !foreign ? 1 : (dto.exchangeRate ?? (dto.amountEur !== undefined && dto.amount !== 0 ? round6(dto.amountEur / dto.amount) : undefined));
    if (!exchangeRate) throw new BadRequestException(`Incasso in ${invoice.currency}: indica il cambio del giorno dell'incasso (art. 9 c. 2 TUIR)`);
    const amountEur = dto.amountEur ?? round2(dto.amount * exchangeRate);
    return this.prisma.payment.create({
      // Without an explicit method, the collection takes the one asked in the invoice (ModalitaPagamento).
      data: { tenantId, invoiceId, date: new Date(`${dto.date}T00:00:00Z`), amount: dto.amount, amountEur, exchangeRate, method: dto.method ?? invoice.paymentMethod, notes: dto.notes },
    });
  }

  async remove(tenantId: string, id: string) {
    const p = await this.prisma.payment.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException(`Payment ${id} not found`);
    await this.prisma.payment.delete({ where: { id } });
  }

  /** Revenue collected in a year (EUR), cash basis. Credit-note refunds are recorded as negative payments. */
  async collectedRevenue(tenantId: string, year: number): Promise<number> {
    const agg = await this.prisma.payment.aggregate({
      where: { tenantId, date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
      _sum: { amountEur: true },
    });
    return Number(agg._sum.amountEur ?? 0);
  }
}
