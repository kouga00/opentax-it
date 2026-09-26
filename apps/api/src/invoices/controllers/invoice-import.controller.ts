import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { TenantId } from '../../common/tenant.decorator.js';
import { ImportInvoicesDto } from '../dto/request/import-invoices.dto.js';
import { PreviewImportDto } from '../dto/request/preview-import.dto.js';
import { ImportPreviewRowDto } from '../dto/response/import-preview-row.dto.js';
import { ImportResultDto } from '../dto/response/import-result.dto.js';
import { toImportPreviewRowDto, toImportResultDto, toUploadedFiles } from '../mappers/invoice-import.mapper.js';
import { InvoicesImportService } from '../services/invoices-import.service.js';

/** Import of FatturaPA XML files issued elsewhere, loose or in ZIP archives. */
@Controller('invoices/import')
export class InvoiceImportController {
  constructor(private readonly importer: InvoicesImportService) {}

  /** What importing these files would do, without writing anything. */
  @Post('preview')
  @HttpCode(200)
  @ApiOkResponse({ type: [ImportPreviewRowDto] })
  async preview(@TenantId() tenantId: string, @Body() dto: PreviewImportDto): Promise<ImportPreviewRowDto[]> {
    return (await this.importer.preview(tenantId, toUploadedFiles(dto.files))).map(toImportPreviewRowDto);
  }

  @Post()
  @ApiCreatedResponse({ type: [ImportResultDto] })
  async import(@TenantId() tenantId: string, @Body() dto: ImportInvoicesDto): Promise<ImportResultDto[]> {
    return (await this.importer.importFiles(tenantId, toUploadedFiles(dto.files), dto.selected)).map(toImportResultDto);
  }
}
