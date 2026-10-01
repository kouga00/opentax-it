import { TaxCreditUsageDto } from '../dto/response/tax-credit-usage.dto.js';
import { TaxCreditDto } from '../dto/response/tax-credit.dto.js';
import type { TaxCreditBalance } from '../types/tax-credit-balance.js';

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Builds the credit response field by field: Decimals become numbers, dates YYYY-MM-DD, the tenant id stays out. */
export function toTaxCreditDto(c: TaxCreditBalance): TaxCreditDto {
  return Object.assign(new TaxCreditDto(), {
    id: c.id,
    section: c.section,
    code: c.code,
    localCode: c.localCode,
    installmentCode: c.installmentCode,
    referenceYear: c.referenceYear,
    amount: Number(c.amount),
    usableFrom: c.usableFrom ? isoDate(c.usableFrom) : null,
    description: c.description,
    notes: c.notes,
    used: c.used,
    remaining: c.remaining,
    usages: c.usages.map((u) =>
      Object.assign(new TaxCreditUsageDto(), {
        amount: Number(u.amount),
        f24Id: u.f24Line.f24.id,
        paymentDate: isoDate(u.f24Line.f24.paymentDate),
        f24Status: u.f24Line.f24.status,
      }),
    ),
  });
}
