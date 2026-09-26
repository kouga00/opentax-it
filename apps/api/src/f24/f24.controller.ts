import { Body, Controller, Get, Header, Param, ParseIntPipe, Patch, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiOkResponse, ApiProduces } from '@nestjs/swagger';
import type { Response } from 'express';
import { attachment } from '../common/content-disposition.js';
import { TenantId } from '../common/tenant.decorator.js';
import { UpdateF24StatusDto } from './dto/request/update-f24-status.dto.js';
import { F24Dto } from './dto/response/f24.dto.js';
import { toSavedF24Dto } from './f24.mapper.js';
import { F24Service } from './f24.service.js';

/** Saved F24 forms, whatever produced them; the installment plans that create them are in InstallmentPlansController. */
@Controller('f24')
export class F24Controller {
  constructor(private readonly service: F24Service) {}

  /** F24 forms of a payment year (all kinds), with lines. */
  @Get()
  @ApiOkResponse({ type: [F24Dto] })
  async list(@TenantId() tenantId: string, @Query('year', ParseIntPipe) year: number): Promise<F24Dto[]> {
    return (await this.service.listByPaymentYear(tenantId, year)).map(toSavedF24Dto);
  }

  @Get(':id')
  @ApiOkResponse({ type: F24Dto })
  async one(@TenantId() tenantId: string, @Param('id') id: string): Promise<F24Dto> {
    return toSavedF24Dto(await this.service.get(tenantId, id));
  }

  /** The form printed on the official AdE model (three copies). */
  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'Modello F24 in PDF' })
  async pdf(@TenantId() tenantId: string, @Param('id') id: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const { fileName, content } = await this.service.pdf(tenantId, id);
    res.setHeader('Content-Disposition', attachment(fileName));
    return new StreamableFile(Buffer.from(content));
  }

  @Patch(':id/status')
  @ApiOkResponse({ type: F24Dto })
  async status(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateF24StatusDto): Promise<F24Dto> {
    return toSavedF24Dto(await this.service.updateStatus(tenantId, id, dto));
  }
}
