import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { XmlDocumentKind } from '@opentax-it/fatturapa';

export class ImportResultDto {
  @ApiProperty({ description: 'File, o percorso nello zip ("archivio.zip/cartella/file.xml")' }) file!: string;
  @ApiPropertyOptional({ enum: ['INVOICE', 'SDI_RECEIPT', 'SDI_MESSAGE', 'SDI_METADATA'] }) kind?: XmlDocumentKind;
  @ApiProperty({ enum: ['IMPORTED', 'SKIPPED', 'ERROR'] }) status!: 'IMPORTED' | 'SKIPPED' | 'ERROR';
  @ApiPropertyOptional() number?: string;
  @ApiPropertyOptional() invoiceId?: string;
  @ApiPropertyOptional() customer?: string;
  @ApiPropertyOptional() message?: string;
}
