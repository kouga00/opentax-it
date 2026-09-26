import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { F24Section } from '../../../generated/prisma/enums.js';

/** A credit to create or to replace (PUT): every field is sent each time. */
export class SaveTaxCreditDto {
  @ApiProperty({ enum: F24Section, description: 'Sezione del modello F24' })
  @IsEnum(F24Section) section!: F24Section;

  @ApiProperty({ description: 'Codice tributo (es. 4001, 1792, 3844) o causale INPS (es. PXX)', example: '4001' })
  @IsString() @Matches(/^[A-Z0-9]{3,6}$/) code!: string;

  @ApiProperty({ example: 2025 })
  @IsInt() @Min(2000) referenceYear!: number;

  @ApiProperty({ description: 'Importo del credito in euro' })
  @IsNumber() @Min(0.01) @Max(1_000_000_000) amount!: number;

  @ApiPropertyOptional({ description: 'Codice regione o codice catastale del comune (sezioni regioni ed enti locali)' })
  @IsOptional() @IsString() @Matches(/^([A-Z0-9]{1,4})?$/) localCode?: string;

  @ApiPropertyOptional({ description: 'Rateazione / mese di riferimento (4 cifre)' })
  @IsOptional() @IsString() @Matches(/^(\d{4})?$/) installmentCode?: string;

  @ApiPropertyOptional({ description: 'Utilizzabile dal (AAAA-MM-GG)' })
  @IsOptional() @IsString() @Matches(/^(\d{4}-\d{2}-\d{2})?$/) usableFrom?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @Length(0, 120) description?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
