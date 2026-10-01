import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Put } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { todayInItaly } from '../../common/italian-date.js';
import { FileReturnDto } from '../dto/request/file-return.dto.js';
import { FiledReturnDto } from '../dto/response/filed-return.dto.js';
import { TenantId } from '../../common/tenant.decorator.js';
import { UpdateTaxYearDataDto } from '../dto/request/update-tax-year-data.dto.js';
import { ReturnGuideDto } from '../dto/response/return-guide.dto.js';
import { toFiledReturnDto, toReturnGuideDto } from '../mappers/return-guide.mapper.js';
import { ReturnFilingService } from '../services/return-filing.service.js';
import { ReturnGuideService } from '../services/return-guide.service.js';
import { TaxesService } from '../services/taxes.service.js';

@ApiTags('Imposte e contributi')
@Controller('taxes')
export class TaxesController {
  constructor(
    private readonly service: TaxesService,
    private readonly returnGuide: ReturnGuideService,
    private readonly filing: ReturnFilingService,
  ) {}

  @ApiOperation({ summary: 'Guida alla precompilata Redditi PF: quadri LM, RR e RX calcolati e fatture incassate in un anno diverso da quello di emissione' })
  @Get(':year/return-guide')
  @ApiOkResponse({ type: ReturnGuideDto })
  async guide(@TenantId() tenantId: string, @Param('year', ParseIntPipe) year: number): Promise<ReturnGuideDto> {
    const [guide, filed] = await Promise.all([this.returnGuide.guide(tenantId, year), this.filing.get(tenantId, year)]);
    return toReturnGuideDto(guide, filed);
  }

  @ApiOperation({ summary: 'Segna la dichiarazione dei redditi come presentata e registra i crediti che ne risultano (RX31, RR8) tra i crediti' })
  @Put(':year/return')
  @ApiOkResponse({ type: FiledReturnDto })
  async file(@TenantId() tenantId: string, @Param('year', ParseIntPipe) year: number, @Body() dto: FileReturnDto): Promise<FiledReturnDto> {
    if (dto.filedOn > todayInItaly()) throw new BadRequestException('La data di presentazione non può essere nel futuro');
    return toFiledReturnDto(await this.filing.markFiled(tenantId, year, dto.filedOn));
  }

  @ApiOperation({ summary: 'Annulla la presentazione della dichiarazione e toglie i crediti registrati, se nessun F24 li usa' })
  @Delete(':year/return')
  @HttpCode(204)
  @ApiNoContentResponse()
  async unfile(@TenantId() tenantId: string, @Param('year', ParseIntPipe) year: number): Promise<void> {
    await this.filing.unmark(tenantId, year);
  }

  @ApiOperation({ summary: 'Riepilogo di reddito, imposta sostitutiva e contributi INPS dell\'anno' })
  @Get(':year/summary')
  summary(@TenantId() tenantId: string, @Param('year', ParseIntPipe) year: number) { return this.service.summary(tenantId, year); }

  @ApiOperation({ summary: 'Dati dell\'anno inseriti a mano' })
  @Get(':year/data')
  data(@TenantId() tenantId: string, @Param('year', ParseIntPipe) year: number) { return this.service.yearData(tenantId, year); }

  @ApiOperation({ summary: 'Salva i dati dell\'anno inseriti a mano' })
  @Put(':year/data')
  update(@TenantId() tenantId: string, @Param('year', ParseIntPipe) year: number, @Body() dto: UpdateTaxYearDataDto) {
    return this.service.updateYearData(tenantId, year, dto);
  }
}
