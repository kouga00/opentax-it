import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { ImportFileDto } from './import-file.dto.js';

export class PreviewImportDto {
  @ApiProperty({ type: [ImportFileDto], minItems: 1, maxItems: 200 })
  @ValidateNested({ each: true }) @Type(() => ImportFileDto) @ArrayMinSize(1) @ArrayMaxSize(200) files!: ImportFileDto[];
}
