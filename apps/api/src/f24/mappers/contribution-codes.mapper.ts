import { OTHER_ENTITIES, SELF_EMPLOYED_ROW_REASONS } from '@opentax-it/fiscal-rules';
import { ContributionCodesDto } from '../dto/response/contribution-codes.dto.js';

/** The codes of packages/fiscal-rules (other-entities.ts, inps-self-employed.ts) as the response DTO. */
export function toContributionCodesDto(): ContributionCodesDto {
  return Object.assign(new ContributionCodesDto(), {
    otherEntities: OTHER_ENTITIES.map(({ code, name, fundType, period, periodRule, positionCode, reasons }) => ({
      code,
      name,
      fundType,
      period,
      periodRule,
      positionCode,
      reasons: reasons.map(({ code, description, deduction }) => ({ code, description, deduction })),
    })),
    selfEmployedReasons: SELF_EMPLOYED_ROW_REASONS.flatMap(({ artisans, traders, description, deduction }) => [
      { code: artisans, description: `Artigiani - ${description}`, deduction },
      { code: traders, description: `Commercianti - ${description}`, deduction },
    ]),
  });
}
