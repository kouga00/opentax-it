import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { F24LineRole, F24Section } from '../../../generated/prisma/enums.js';

export class F24LineDto {
  @ApiPropertyOptional({ description: 'Assente nelle righe di un piano non ancora salvato' }) id?: string;
  @ApiProperty({ enum: F24Section }) section!: F24Section;
  @ApiProperty({ enum: F24LineRole }) role!: F24LineRole;
  @ApiProperty({ description: 'Codice tributo o causale INPS' }) code!: string;
  @ApiProperty({ type: String, nullable: true }) officeCode!: string | null;
  @ApiProperty({ type: String, nullable: true }) installmentCode!: string | null;
  @ApiProperty({ type: String, nullable: true }) localCode!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Periodo INPS MM/AAAA' }) periodFrom!: string | null;
  @ApiProperty({ type: String, nullable: true }) periodTo!: string | null;
  @ApiProperty() referenceYear!: number;
  @ApiProperty() debitAmount!: number;
  @ApiProperty({ description: 'Parte del debito che è maggiorazione per differimento' }) surchargeAmount!: number;
  @ApiProperty() creditAmount!: number;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
}
