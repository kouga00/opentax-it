import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ImportFileDto } from './import-file.dto.js';

export class ImportDocumentsDto {
  @ApiProperty({ type: [ImportFileDto], minItems: 1, maxItems: 200 })
  @ValidateNested({ each: true }) @Type(() => ImportFileDto) @ArrayMinSize(1) @ArrayMaxSize(200) files!: ImportFileDto[];

  @ApiPropertyOptional({ type: [String], description: 'Righe della preview da importare (campo "file"); se assente si importano tutte' })
  @IsOptional() @IsArray() @ArrayMaxSize(2000) @IsString({ each: true }) @MaxLength(500, { each: true }) selected?: string[];
}
