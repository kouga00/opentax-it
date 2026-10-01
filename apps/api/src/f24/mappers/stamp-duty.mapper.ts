import { StampDutyF24RefDto } from '../dto/response/stamp-duty-f24-ref.dto.js';
import { StampDutyQuarterDto } from '../dto/response/stamp-duty-quarter.dto.js';
import type { StampDutyQuarter } from '../types/stamp-duty-quarter.js';

export function toStampDutyQuarterDto(q: StampDutyQuarter): StampDutyQuarterDto {
  return Object.assign(new StampDutyQuarterDto(), {
    year: q.year,
    quarter: q.quarter,
    taxCode: q.taxCode,
    estimatedAmount: q.estimatedAmount,
    estimated: q.estimated,
    dueAmount: q.dueAmount,
    paymentDeadline: q.paymentDeadline,
    deferredFrom: q.deferredFrom,
    listBChangesBy: q.listBChangesBy,
    amountAvailableOn: q.amountAvailableOn,
    f24: q.f24 ? Object.assign(new StampDutyF24RefDto(), q.f24) : null,
    paidOnPortal: q.paidOnPortal,
  });
}
