import { FiledCreditDto } from '../dto/response/filed-credit.dto.js';
import { FiledReturnDto } from '../dto/response/filed-return.dto.js';
import { ReturnGuideDto } from '../dto/response/return-guide.dto.js';
import { ReturnFormDto } from '../dto/response/return-form.dto.js';
import { ReturnRevenueDto } from '../dto/response/return-revenue.dto.js';
import { ReturnRowDto } from '../dto/response/return-row.dto.js';
import { RevenueDifferenceDto } from '../dto/response/revenue-difference.dto.js';
import type { FiledReturn } from '../types/filed-return.js';
import type { ReturnGuide } from '../types/return-guide.js';
import type { RevenueDifference } from '../types/revenue-difference.js';

/** Builds the return guide DTO field by field. */

const toDifferenceDto = (d: RevenueDifference): RevenueDifferenceDto =>
  Object.assign(new RevenueDifferenceDto(), { invoiceId: d.invoiceId, number: d.number, date: d.date, customer: d.customer, amount: d.amount });

export function toFiledReturnDto(f: FiledReturn): FiledReturnDto {
  return Object.assign(new FiledReturnDto(), {
    filedOn: f.filedOn,
    credits: f.credits.map((c) => Object.assign(new FiledCreditDto(), { id: c.id, section: c.section, code: c.code, referenceYear: c.referenceYear, amount: c.amount })),
  });
}

export function toReturnGuideDto(g: ReturnGuide, filed: FiledReturn | null): ReturnGuideDto {
  return Object.assign(new ReturnGuideDto(), {
    year: g.year,
    forms: g.forms.map((f) => Object.assign(new ReturnFormDto(), {
      id: f.id,
      rows: f.rows.map((r) => Object.assign(new ReturnRowDto(), { id: r.id, row: r.row, column: r.column, value: r.value, action: r.action })),
    })),
    revenue: Object.assign(new ReturnRevenueDto(), {
      issuedInYear: g.revenue.issuedInYear,
      collectedInYear: g.revenue.collectedInYear,
      notCollectedInYear: g.revenue.notCollectedInYear.map(toDifferenceDto),
      collectedFromOtherYears: g.revenue.collectedFromOtherYears.map(toDifferenceDto),
    }),
    warnings: g.warnings,
    filed: filed ? toFiledReturnDto(filed) : null,
  });
}
