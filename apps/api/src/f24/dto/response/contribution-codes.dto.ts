import { ApiProperty } from '@nestjs/swagger';
import { ContributionReasonDto } from './contribution-reason.dto.js';
import { OtherEntityDto } from './other-entity.dto.js';

/** Codes for contribution rows entered by hand: professional funds and INPS Artigiani/Commercianti reasons. */
export class ContributionCodesDto {
  @ApiProperty({ type: [OtherEntityDto] }) otherEntities!: OtherEntityDto[];
  @ApiProperty({ type: [ContributionReasonDto], description: 'Causali INPS di Artigiani (A...) e Commercianti (C...)' }) selfEmployedReasons!: ContributionReasonDto[];
}
