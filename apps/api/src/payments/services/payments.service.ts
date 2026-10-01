import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { todayInItaly } from '../../common/italian-date.js';
import { REVENUE_INVOICE_SELECT, revenueShare } from '../../common/revenue.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreatePaymentDto } from '../dto/request/create-payment.dto.js';
import type { InvoiceCollection } from '../types/invoice-collection.js';

/**
 * Collections on invoices. Cash basis (L. 190/2014 art. 1 par. 64; Istr. LM section III):
 * revenue belongs to the year in which it is collected, whatever the invoice date.
 */
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * A collection keeps what was collected between zero and the document total: an invoice cannot be collected
 * twice, and a negative amount (money given back) cannot exceed what was collected. On a credit note (TD04) the
 * refunds are negative amounts, so the same bounds apply with the sign reversed.
 */
export function checkCollectable(type: string, total: number, recorded: number, amount: number, currency: string): void {
  const sign = type === 'TD04' ? -1 : 1;
  const collected = round2(sign * recorded);
  const after = round2(collected + sign * amount);
  const money = (n: number) => `${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  if (after > total) {
    const remaining = round2(total - collected);
    throw new BadRequestException(remaining <= 0
      ? `Il documento risulta già ${sign < 0 ? 'rimborsato' : 'incassato'} del tutto (${money(total)})`
      : `L'importo supera il residuo da ${sign < 0 ? 'rimborsare' : 'incassare'} (${money(remaining)})`);
  }
  if (after < 0) throw new BadRequestException(`L'importo restituito supera quanto già ${sign < 0 ? 'rimborsato' : 'incassato'} (${money(collected)})`);
}

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** What an issued document asks, what was collected and what is left, in the document currency. */
  async collection(tenantId: string, invoiceId: string): Promise<InvoiceCollection> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { payments: { orderBy: { date: 'asc' } } },
    });
    if (!invoice) throw new NotFoundException('Fattura non trovata');
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
    if (!invoice) throw new NotFoundException('Fattura non trovata');
    if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED') throw new BadRequestException('Gli incassi si registrano solo sui documenti emessi');
    // Cash basis: a collection counts in the year it happens, so it is recorded once it has happened.
    if (dto.date > todayInItaly()) throw new BadRequestException("La data dell'incasso non può essere nel futuro: registralo quando il pagamento arriva");
    // Income in foreign currency is valued at the rate of the day it is collected (TUIR art. 9 par. 2:
    // "secondo il cambio del giorno in cui sono stati percepiti … o del giorno antecedente più prossimo"),
    // not at the invoice rate: for non-EUR invoices the collection needs its own rate or EUR amount.
    const foreign = invoice.currency !== 'EUR';
    const exchangeRate = !foreign ? 1 : (dto.exchangeRate ?? (dto.amountEur !== undefined && dto.amount !== 0 ? round6(dto.amountEur / dto.amount) : undefined));
    if (!exchangeRate) throw new BadRequestException(`Incasso in ${invoice.currency}: indica il cambio del giorno dell'incasso (art. 9 c. 2 TUIR)`);
    const amountEur = dto.amountEur ?? round2(dto.amount * exchangeRate);
    return this.prisma.$transaction(async (tx) => {
      // One collection at a time per invoice, so two requests sent together cannot both pass the check below.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`collect:${invoiceId}`}))`;
      const { _sum } = await tx.payment.aggregate({ where: { invoiceId, tenantId }, _sum: { amount: true } });
      checkCollectable(invoice.type, Number(invoice.total), Number(_sum.amount ?? 0), dto.amount, invoice.currency);
      return tx.payment.create({
        // Without an explicit method, the collection takes the one asked in the invoice (ModalitaPagamento).
        data: { tenantId, invoiceId, date: new Date(`${dto.date}T00:00:00Z`), amount: dto.amount, amountEur, exchangeRate, method: dto.method ?? invoice.paymentMethod, notes: dto.notes },
      });
    });
  }

  async remove(tenantId: string, id: string) {
    const p = await this.prisma.payment.findFirst({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Incasso non trovato');
    await this.prisma.payment.delete({ where: { id } });
  }

  /**
   * Revenue collected in a year (EUR), cash basis, without professional fund contributions (common/revenue.ts).
   * Credit-note refunds are recorded as negative payments.
   */
  async collectedRevenue(tenantId: string, year: number): Promise<number> {
    const payments = await this.prisma.payment.findMany({
      where: { tenantId, date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
      select: { amountEur: true, invoice: { select: REVENUE_INVOICE_SELECT } },
    });
    return round2(payments.reduce((s, p) => s + revenueShare(Number(p.amountEur), p.invoice), 0));
  }
}
