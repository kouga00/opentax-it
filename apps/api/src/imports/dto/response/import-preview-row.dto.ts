import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { XML_DOCUMENT_KINDS, type XmlDocumentKind } from '@opentax-it/fatturapa';
import { IMPORT_PREVIEW_STATUSES } from '../../../common/import/import-statuses.js';

export class ImportPreviewRowDto {
  @ApiProperty({ description: 'File, o percorso nello zip ("archivio.zip/cartella/file.xml")' }) file!: string;
  @ApiPropertyOptional({ enum: XML_DOCUMENT_KINDS, description: 'Tipo di documento, se riconosciuto' }) kind?: XmlDocumentKind;
  @ApiProperty({ enum: IMPORT_PREVIEW_STATUSES, description: 'NEW: da importare; DUPLICATE: già presente; ERROR: non importabile; IGNORED: non è un documento da importare' })
  status!: (typeof IMPORT_PREVIEW_STATUSES)[number];
  @ApiPropertyOptional({ description: 'Riga da importare insieme (la fattura di una ricevuta nello stesso caricamento)' }) requires?: string;
  @ApiPropertyOptional({ example: 'TD01', description: 'Fattura: TipoDocumento; ricevuta SDI: RC, NS o MC' }) documentType?: string;
  @ApiPropertyOptional({ description: 'Numero della fattura (per una ricevuta, della fattura a cui si riferisce)' }) number?: string;
  @ApiPropertyOptional({ description: 'Data del documento o della ricevuta (AAAA-MM-GG)' }) date?: string;
  @ApiPropertyOptional() customer?: string;
  @ApiPropertyOptional({ description: 'Importo totale del documento' }) total?: number;
  @ApiPropertyOptional({ description: 'Fattura già presente o a cui si riferisce la ricevuta' }) invoiceId?: string;
  @ApiPropertyOptional() message?: string;
}
