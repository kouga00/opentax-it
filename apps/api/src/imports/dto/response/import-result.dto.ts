import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { XML_DOCUMENT_KINDS, type XmlDocumentKind } from '@opentax-it/fatturapa';
import { IMPORT_RESULT_STATUSES } from '../../../common/import/import-statuses.js';

export class ImportResultDto {
  @ApiProperty({ description: 'File, o percorso nello zip ("archivio.zip/cartella/file.xml")' }) file!: string;
  @ApiPropertyOptional({ enum: XML_DOCUMENT_KINDS }) kind?: XmlDocumentKind;
  @ApiProperty({ enum: IMPORT_RESULT_STATUSES }) status!: (typeof IMPORT_RESULT_STATUSES)[number];
  @ApiPropertyOptional() number?: string;
  @ApiPropertyOptional() invoiceId?: string;
  @ApiPropertyOptional() customer?: string;
  @ApiPropertyOptional() message?: string;
}
