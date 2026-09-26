import { Controller, Get, Header, Param, Res, StreamableFile } from '@nestjs/common';
import { ApiOkResponse, ApiProduces } from '@nestjs/swagger';
import type { Response } from 'express';
import { attachment } from '../common/content-disposition.js';
import { TenantId } from '../common/tenant.decorator.js';
import { InvoicesService } from './invoices.service.js';

/** Files of a document: the FatturaPA XML sent to SDI and the courtesy copy in PDF. */
@Controller('invoices/:id')
export class InvoiceFilesController {
  constructor(private readonly service: InvoicesService) {}

  @Get('xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @ApiProduces('application/xml')
  @ApiOkResponse({ description: 'XML FatturaPA del documento emesso' })
  async xml(@TenantId() tenantId: string, @Param('id') id: string, @Res({ passthrough: true }) res: Response): Promise<string> {
    const { fileName, content } = await this.service.xml(tenantId, id);
    res.setHeader('Content-Disposition', attachment(fileName));
    return content;
  }

  @Get('pdf')
  @Header('Content-Type', 'application/pdf')
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'Copia di cortesia in PDF' })
  async pdf(@TenantId() tenantId: string, @Param('id') id: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const { fileName, content } = await this.service.pdf(tenantId, id);
    res.setHeader('Content-Disposition', attachment(fileName));
    return new StreamableFile(Buffer.from(content));
  }
}
