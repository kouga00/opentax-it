import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { todayInItaly } from '../common/italian-date.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Daily reference exchange rates from Banca d'Italia (REST API v1.0, "Tassi di Cambio – Istruzioni
 * tecnico-operative"): rates against the euro "di concerto con le altre Banche Centrali del SEBC",
 * published as "Quantità di valuta estera per 1 Euro". Usable for invoices (DPR 633/72 art. 13 par. 4
 * allows the ECB rate) and for income (TUIR art. 9 par. 2: rate of the day of collection "o del giorno
 * antecedente più prossimo"): when a day has no quotation (weekends, holidays) the previous quoted day
 * is used. Each day is downloaded once, with all currencies, and cached.
 */
export const EXCHANGE_RATES_URL = process.env.EXCHANGE_RATES_URL ?? 'https://tassidicambio.bancaditalia.it/terzevalute-wf-web/rest/v1.0/dailyRates';
export const EXCHANGE_RATES_SOURCE = "Banca d'Italia, tassi di cambio di riferimento";
/** How many days back to look for the last quotation before the requested date. */
const MAX_LOOKBACK_DAYS = 7;

export interface ExchangeRateResult {
  currency: string;
  requestedDate: string;
  /** Day of the quotation actually used (≤ requestedDate). */
  quotationDate: string;
  unitsPerEur: number;
  source: string;
}

interface DailyRatesResponse {
  resultsInfo?: { totalRecords?: number };
  rates?: Array<{ isoCode: string; avgRate: string; referenceDate: string; exchangeConventionCode?: string }>;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const day = (s: string) => new Date(`${s}T00:00:00Z`);

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async rate(currency: string, date: string): Promise<ExchangeRateResult> {
    const code = currency.toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) throw new BadRequestException('Codice valuta non valido (ISO 4217, es. USD)');
    if (code === 'EUR') return { currency: code, requestedDate: date, quotationDate: date, unitsPerEur: 1, source: 'EUR' };
    const today = todayInItaly();
    if (date > today) throw new BadRequestException('Data futura: il cambio non è ancora disponibile');

    for (let i = 0; i <= MAX_LOOKBACK_DAYS; i++) {
      const d = iso(new Date(day(date).getTime() - i * 86_400_000));
      await this.ensureDay(d, today);
      const row = await this.prisma.exchangeRate.findUnique({ where: { date_currency: { date: day(d), currency: code } } });
      if (row) return { currency: code, requestedDate: date, quotationDate: d, unitsPerEur: Number(row.unitsPerEur), source: row.source };
    }
    throw new NotFoundException(`Nessuna quotazione Banca d'Italia per ${code} nei ${MAX_LOOKBACK_DAYS} giorni fino al ${date}: inserisci il cambio a mano`);
  }

  /** Downloads a day once (all currencies). A day without quotations is remembered, except today. */
  private async ensureDay(date: string, today: string) {
    if (await this.prisma.exchangeRateDay.findUnique({ where: { date: day(date) } })) return;
    const url = `${EXCHANGE_RATES_URL}?referenceDate=${date}&currencyIsoCode=EUR&lang=it`;
    let body: DailyRatesResponse;
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      body = (await res.json()) as DailyRatesResponse;
    } catch (e) {
      this.logger.warn(`Exchange rates for ${date} not available: ${(e as Error).message}`);
      throw new ServiceUnavailableException("Cambi della Banca d'Italia non raggiungibili: inserisci il cambio a mano");
    }
    // Convention "C" = units of foreign currency per 1 EUR; other conventions are not stored.
    const rates = (body.rates ?? []).filter((r) => r.referenceDate === date && (r.exchangeConventionCode ?? 'C') === 'C' && Number(r.avgRate) > 0);
    if (rates.length === 0 && date >= today) return; // today's rates may be published later
    await this.prisma.$transaction([
      ...rates.map((r) =>
        this.prisma.exchangeRate.upsert({
          where: { date_currency: { date: day(date), currency: r.isoCode } },
          create: { date: day(date), currency: r.isoCode, unitsPerEur: Number(r.avgRate), source: EXCHANGE_RATES_SOURCE },
          update: {},
        }),
      ),
      // Shared currencies (e.g. XOF) are listed once per country with the same rate: count distinct codes.
      this.prisma.exchangeRateDay.create({ data: { date: day(date), records: new Set(rates.map((r) => r.isoCode)).size } }),
    ]);
  }
}
