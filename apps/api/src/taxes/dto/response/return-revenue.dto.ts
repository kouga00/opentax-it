import { ApiProperty } from '@nestjs/swagger';
import { RevenueDifferenceDto } from './revenue-difference.dto.js';

/** Revenue proposed by the pre-filled return (by issue date) and collected (cash basis), with the invoices that explain the difference. */
export class ReturnRevenueDto {
  @ApiProperty({ description: 'Ricavi delle fatture emesse nell\'anno: quelli proposti dalla precompilata' }) issuedInYear!: number;
  @ApiProperty({ description: 'Ricavi incassati nell\'anno (LM22 colonna 3)' }) collectedInYear!: number;
  @ApiProperty({ type: [RevenueDifferenceDto], description: 'Fatture dell\'anno non incassate nell\'anno: da togliere' }) notCollectedInYear!: RevenueDifferenceDto[];
  @ApiProperty({ type: [RevenueDifferenceDto], description: 'Fatture di altri anni incassate nell\'anno: da aggiungere' }) collectedFromOtherYears!: RevenueDifferenceDto[];
}
