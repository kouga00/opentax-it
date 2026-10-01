import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

/** One contribution row of an F24, as communicated by the entity; checked against the entity's rules (contribution-rows.ts). */
export class ContributionRowDto {
  @ApiProperty({ enum: ['INPS', 'OTHER_ENTITY'], description: 'Sezione INPS o "Altri enti previdenziali e assicurativi"' })
  @IsIn(['INPS', 'OTHER_ENTITY']) section!: 'INPS' | 'OTHER_ENTITY';

  @ApiPropertyOptional({ description: 'Codice ente (sezione Altri enti), es. 0013' })
  @IsOptional() @IsString() @Matches(/^\d{4}$/) entityCode?: string;

  @ApiPropertyOptional({ description: 'Codice sede' })
  @IsOptional() @IsString() @Matches(/^[A-Z0-9]{1,5}$/) officeCode?: string;

  @ApiProperty({ description: 'Causale contributo' })
  @IsString() @Matches(/^[A-Z0-9]{2,4}$/) reason!: string;

  @ApiPropertyOptional({ description: 'Matricola/codice INPS o codice posizione' })
  @IsOptional() @IsString() @Matches(/^[A-Z0-9]{1,17}$/) positionCode?: string;

  @ApiPropertyOptional({ description: 'Periodo da MM/AAAA, o AAAA dove l\'ente chiede solo l\'anno' })
  @IsOptional() @IsString() @Matches(/^(\d{2}\/)?\d{4}$/) periodFrom?: string;

  @ApiPropertyOptional({ description: 'Periodo a MM/AAAA' })
  @IsOptional() @IsString() @Matches(/^\d{2}\/\d{4}$/) periodTo?: string;

  @ApiProperty({ description: 'Importo a debito, in euro' })
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(1_000_000) amount!: number;

  @ApiPropertyOptional({ description: 'Parte deducibile (LM35), solo per le causali che uniscono contributi deducibili e non' })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1_000_000) deductibleAmount?: number;
}
