import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { XmlDocumentKind } from '@opentax-it/fatturapa';

const KINDS = ['INVOICE', 'SDI_RECEIPT', 'SDI_MESSAGE', 'SDI_METADATA'];

export class ImportPreviewRowDto {
  @ApiProperty({ description: 'File, o percorso nello zip ("archivio.zip/cartella/file.xml")' }) file!: string;
  @ApiPropertyOptional({ enum: KINDS, description: 'Tipo di documento, se riconosciuto' }) kind?: XmlDocumentKind;
  @ApiProperty({ enum: ['NEW', 'DUPLICATE', 'ERROR', 'IGNORED'], description: 'NEW: da importare; DUPLICATE: già presente; ERROR: non importabile; IGNORED: non è un documento da importare' })
  status!: 'NEW' | 'DUPLICATE' | 'ERROR' | 'IGNORED';
  @ApiPropertyOptional({ example: 'TD01', description: 'Fattura: TipoDocumento; ricevuta SDI: RC, NS o MC' }) documentType?: string;
  @ApiPropertyOptional({ description: 'Numero della fattura (per una ricevuta, della fattura a cui si riferisce)' }) number?: string;
  @ApiPropertyOptional({ description: 'Data del documento o della ricevuta (AAAA-MM-GG)' }) date?: string;
  @ApiPropertyOptional() customer?: string;
  @ApiPropertyOptional({ description: 'Importo totale del documento' }) total?: number;
  @ApiPropertyOptional({ description: 'Fattura già presente o a cui si riferisce la ricevuta' }) invoiceId?: string;
  @ApiPropertyOptional() message?: string;
}
