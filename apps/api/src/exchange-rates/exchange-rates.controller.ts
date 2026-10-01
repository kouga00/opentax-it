import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/public.decorator.js';
import { ExchangeRateQuery } from './exchange-rates.dto.js';
import { ExchangeRatesService } from './exchange-rates.service.js';

@ApiTags('Cambi')
@Public()
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  /** Reference rate for a currency and day ("1 EUR = X units"), from the cache or Banca d'Italia. */
  @ApiOperation({ summary: 'Cambio di riferimento della Banca d\'Italia per una valuta e un giorno' })
  @Get()
  rate(@Query() q: ExchangeRateQuery) {
    return this.service.rate(q.currency, q.date);
  }
}
