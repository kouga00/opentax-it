import { ApiProperty } from '@nestjs/swagger';
import { THRESHOLD_LEVELS, type ThresholdLevel } from '@opentax-it/fiscal-rules';

/** Collected revenue of the year against the 85,000 and 100,000 thresholds (L. 190/2014 art. 1 c. 54 and 71). */
export class ThresholdOutlookDto {
  @ApiProperty() collectedRevenue!: number;
  @ApiProperty({ description: 'Soglia per restare nel regime l\'anno successivo (c. 54)' }) accessThreshold!: number;
  @ApiProperty({ description: 'Soglia di uscita immediata (c. 71)' }) exitThreshold!: number;
  @ApiProperty() exceedsAccessThreshold!: boolean;
  @ApiProperty() exceedsExitThreshold!: boolean;
  @ApiProperty({ description: 'Documenti emessi non ancora incassati, in euro' }) outstanding!: number;
  @ApiProperty({ description: 'Documento in emissione, in euro' }) invoiceTotal!: number;
  @ApiProperty({ description: 'Incassato + da incassare + documento in emissione' }) projected!: number;
  @ApiProperty({ enum: THRESHOLD_LEVELS }) accessLevel!: ThresholdLevel;
  @ApiProperty({ enum: THRESHOLD_LEVELS }) exitLevel!: ThresholdLevel;
  @ApiProperty({ type: Number, nullable: true, description: 'Limite personale scelto nel profilo' }) personalLimit!: number | null;
  @ApiProperty() projectedOverExit!: boolean;
  @ApiProperty() projectedOverPersonalLimit!: boolean;
}
