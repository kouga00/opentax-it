import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsDateString, ValidateNested } from 'class-validator';
import { ContributionRowDto } from './contribution-row.dto.js';

/** An F24 with contribution rows entered by the taxpayer (INPS Artigiani/Commercianti, professional funds). */
export class CreateContributionF24Dto {
  @ApiProperty({ description: 'Data di pagamento (AAAA-MM-GG)' })
  @IsDateString() paymentDate!: string;

  @ApiProperty({ type: [ContributionRowDto] })
  @ValidateNested({ each: true }) @Type(() => ContributionRowDto) @ArrayMinSize(1) @ArrayMaxSize(6) lines!: ContributionRowDto[];
}
