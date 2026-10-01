import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContributionReasonDto } from './contribution-reason.dto.js';

/** An entity of the F24 section "Altri enti previdenziali e assicurativi". */
export class OtherEntityDto {
  @ApiProperty({ description: 'Codice ente' }) code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ description: 'TipoCassa FatturaPA della stessa cassa' }) fundType?: string;
  @ApiProperty({ enum: ['MONTH_YEAR', 'YEAR'] }) period!: string;
  @ApiProperty({ description: 'Regola del periodo di riferimento, dalla fonte' }) periodRule!: string;
  @ApiProperty({ enum: ['NONE', 'REQUIRED'] }) positionCode!: string;
  @ApiProperty({ type: [ContributionReasonDto] }) reasons!: ContributionReasonDto[];
}
