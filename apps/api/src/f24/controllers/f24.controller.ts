import { Body, Controller, Delete, Get, Header, HttpCode, Param, ParseIntPipe, Patch, Post, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { attachment } from '../../common/content-disposition.js';
import { TenantId } from '../../common/tenant.decorator.js';
import { CreateContributionF24Dto } from '../dto/request/create-contribution-f24.dto.js';
import { TelematicFileQueryDto } from '../dto/request/telematic-file-query.dto.js';
import { UpdateF24StatusDto } from '../dto/request/update-f24-status.dto.js';
import { ContributionCodesDto } from '../dto/response/contribution-codes.dto.js';
import { F24Dto } from '../dto/response/f24.dto.js';
import { toContributionCodesDto } from '../mappers/contribution-codes.mapper.js';
import { toSavedF24Dto } from '../mappers/f24.mapper.js';
import { ContributionF24Service } from '../services/contribution-f24.service.js';
import { F24TelematicFileService } from '../services/f24-telematic-file.service.js';
import { F24Service } from '../services/f24.service.js';

/** Saved F24 forms, whatever produced them; the installment plans that create them are in InstallmentPlansController. */
@ApiTags('F24')
@Controller('f24')
export class F24Controller {
  constructor(
    private readonly service: F24Service,
    private readonly contributions: ContributionF24Service,
    private readonly telematicFile: F24TelematicFileService,
  ) {}

  /** F24 forms of a payment year (all kinds), with lines. */
  @ApiOperation({ summary: 'Modelli F24 di un anno di versamento' })
  @Get()
  @ApiOkResponse({ type: [F24Dto] })
  async list(@TenantId() tenantId: string, @Query('year', ParseIntPipe) year: number): Promise<F24Dto[]> {
    return (await this.service.listByPaymentYear(tenantId, year)).map(toSavedF24Dto);
  }

  @ApiOperation({ summary: 'Enti, causali e regole per le righe di contributi inserite a mano' })
  @Get('contribution-codes')
  @ApiOkResponse({ type: ContributionCodesDto })
  contributionCodes(): ContributionCodesDto {
    return toContributionCodesDto();
  }

  /** The forms to pay on a date, in the file of the AdE technical specification, for File Internet. */
  @ApiOperation({ summary: 'File F24 di una data di versamento per File Internet (specifiche tecniche AdE per i contribuenti)' })
  @Get('telematic-file')
  @Header('Content-Type', 'text/plain; charset=us-ascii')
  @ApiProduces('text/plain')
  @ApiOkResponse({ description: 'File di record da 1.900 caratteri' })
  async file(@TenantId() tenantId: string, @Query() query: TelematicFileQueryDto, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const { fileName, content } = await this.telematicFile.file(tenantId, query.date);
    res.setHeader('Content-Disposition', attachment(fileName));
    return new StreamableFile(Buffer.from(content, 'ascii'));
  }

  @ApiOperation({ summary: 'Un modello F24' })
  @Get(':id')
  @ApiOkResponse({ type: F24Dto })
  async one(@TenantId() tenantId: string, @Param('id') id: string): Promise<F24Dto> {
    return toSavedF24Dto(await this.service.get(tenantId, id));
  }

  /** The form printed on the official AdE model (three copies). */
  @ApiOperation({ summary: 'Modello F24 stampato sul modello ufficiale AdE' })
  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  @ApiProduces('application/pdf')
  @ApiOkResponse({ description: 'Modello F24 in PDF' })
  async pdf(@TenantId() tenantId: string, @Param('id') id: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const { fileName, content } = await this.service.pdf(tenantId, id);
    res.setHeader('Content-Disposition', attachment(fileName));
    return new StreamableFile(Buffer.from(content));
  }

  @ApiOperation({ summary: 'Nuovo modello F24 di contributi (INPS Artigiani e Commercianti, casse professionali)' })
  @Post()
  @ApiCreatedResponse({ type: F24Dto })
  async createContributions(@TenantId() tenantId: string, @Body() dto: CreateContributionF24Dto): Promise<F24Dto> {
    return toSavedF24Dto(await this.contributions.create(tenantId, dto));
  }

  @ApiOperation({ summary: 'Modelli F24 delle quattro rate fisse INPS Artigiani e Commercianti di un anno' })
  @Post('fixed-contributions/:year')
  @ApiCreatedResponse({ type: [F24Dto] })
  async fixedContributions(@TenantId() tenantId: string, @Param('year', ParseIntPipe) year: number): Promise<F24Dto[]> {
    return (await this.contributions.createFixedInstallments(tenantId, year)).map(toSavedF24Dto);
  }

  @ApiOperation({ summary: 'Elimina un modello F24 di contributi o del bollo non ancora pagato' })
  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  async remove(@TenantId() tenantId: string, @Param('id') id: string): Promise<void> {
    await this.contributions.remove(tenantId, id);
  }

  @ApiOperation({ summary: 'Aggiorna lo stato di un modello F24' })
  @Patch(':id/status')
  @ApiOkResponse({ type: F24Dto })
  async status(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateF24StatusDto): Promise<F24Dto> {
    return toSavedF24Dto(await this.service.updateStatus(tenantId, id, dto));
  }
}
