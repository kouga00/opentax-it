import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { TenantId } from '../../common/tenant.decorator.js';
import { ImportDocumentsDto } from '../dto/request/import-documents.dto.js';
import { PreviewImportDto } from '../dto/request/preview-import.dto.js';
import { ImportPreviewRowDto } from '../dto/response/import-preview-row.dto.js';
import { ImportResultDto } from '../dto/response/import-result.dto.js';
import { toImportPreviewRowDto, toImportResultDto, toUploadedFiles } from '../mappers/import.mapper.js';
import { DocumentImportService } from '../services/document-import.service.js';

/** Import of invoices issued elsewhere and of SDI receipts, from XML files loose or in ZIP archives. */
@Controller('imports')
export class ImportsController {
  constructor(private readonly importer: DocumentImportService) {}

  /** What importing these files would do, without writing anything. */
  @Post('preview')
  @HttpCode(200)
  @ApiOkResponse({ type: [ImportPreviewRowDto] })
  async preview(@TenantId() tenantId: string, @Body() dto: PreviewImportDto): Promise<ImportPreviewRowDto[]> {
    return (await this.importer.preview(tenantId, toUploadedFiles(dto.files))).map(toImportPreviewRowDto);
  }

  @Post()
  @ApiCreatedResponse({ type: [ImportResultDto] })
  async import(@TenantId() tenantId: string, @Body() dto: ImportDocumentsDto): Promise<ImportResultDto[]> {
    return (await this.importer.importFiles(tenantId, toUploadedFiles(dto.files), dto.selected)).map(toImportResultDto);
  }
}
