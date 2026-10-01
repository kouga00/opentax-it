import { ApiProperty } from '@nestjs/swagger';
import { F24Section } from '../../../generated/prisma/enums.js';
import { TaxCreditUsageDto } from './tax-credit-usage.dto.js';

export class TaxCreditDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: F24Section }) section!: F24Section;
  @ApiProperty() code!: string;
  @ApiProperty({ type: String, nullable: true }) localCode!: string | null;
  @ApiProperty({ type: String, nullable: true }) installmentCode!: string | null;
  @ApiProperty() referenceYear!: number;
  @ApiProperty({ description: 'Importo del credito' }) amount!: number;
  @ApiProperty({ type: String, nullable: true, description: 'AAAA-MM-GG' }) usableFrom!: string | null;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ type: String, nullable: true }) notes!: string | null;
  @ApiProperty({ description: 'Già usato negli F24' }) used!: number;
  @ApiProperty({ description: 'Ancora da usare' }) remaining!: number;
  @ApiProperty({ type: [TaxCreditUsageDto] }) usages!: TaxCreditUsageDto[];
}
