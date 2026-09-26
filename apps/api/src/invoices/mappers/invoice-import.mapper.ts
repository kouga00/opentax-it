import type { ImportFileDto } from '../dto/request/import-file.dto.js';
import { ImportPreviewRowDto } from '../dto/response/import-preview-row.dto.js';
import { ImportResultDto } from '../dto/response/import-result.dto.js';
import type { ImportPreviewRow } from '../types/import-preview-row.js';
import type { ImportResult } from '../types/import-result.js';
import type { UploadedFile } from '../types/uploaded-file.js';

/** Decodes the uploaded files and builds the response DTOs of the invoice import field by field. */

export function toUploadedFiles(files: ImportFileDto[]): UploadedFile[] {
  return files.map((f) => ({ name: f.name, content: Buffer.from(f.contentBase64, 'base64') }));
}

export function toImportPreviewRowDto(r: ImportPreviewRow): ImportPreviewRowDto {
  return Object.assign(new ImportPreviewRowDto(), {
    file: r.file,
    status: r.status,
    documentType: r.documentType,
    number: r.number,
    date: r.date,
    customer: r.customer,
    total: r.total,
    invoiceId: r.invoiceId,
    message: r.message,
  });
}

export function toImportResultDto(r: ImportResult): ImportResultDto {
  return Object.assign(new ImportResultDto(), {
    file: r.file,
    status: r.status,
    number: r.number,
    invoiceId: r.invoiceId,
    customer: r.customer,
    message: r.message,
  });
}
