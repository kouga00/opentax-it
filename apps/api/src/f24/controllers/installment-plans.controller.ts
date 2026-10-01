import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/tenant.decorator.js';
import { PlanParametersDto } from '../dto/request/plan-parameters.dto.js';
import { InstallmentPlanDto } from '../dto/response/installment-plan.dto.js';
import { PlanOptionsDto } from '../dto/response/plan-options.dto.js';
import { PlanPreviewDto } from '../dto/response/plan-preview.dto.js';
import { toInstallmentPlanDto, toPlanOptionsDto, toPlanPreviewDto } from '../mappers/f24.mapper.js';
import { F24Service } from '../services/f24.service.js';

/** Installment plan of the balance and advances of a tax year, one per year, and the F24 forms it creates. */
@ApiTags('F24')
@Controller('installment-plans')
export class InstallmentPlansController {
  constructor(private readonly service: F24Service) {}

  /** Start dates allowed by the rule set of the payment year and, for each, the maximum number of installments. */
  @ApiOperation({ summary: 'Date di partenza e numero massimo di rate ammessi' })
  @Get(':taxYear/options')
  @ApiOkResponse({ type: PlanOptionsDto })
  async options(@TenantId() tenantId: string, @Param('taxYear', ParseIntPipe) taxYear: number): Promise<PlanOptionsDto> {
    return toPlanOptionsDto(await this.service.planOptions(tenantId, taxYear));
  }

  /** Saved plan of a tax year with its forms, or 404. */
  @ApiOperation({ summary: 'Piano di versamento salvato di un anno d\'imposta' })
  @Get(':taxYear')
  @ApiOkResponse({ type: InstallmentPlanDto })
  async plan(@TenantId() tenantId: string, @Param('taxYear', ParseIntPipe) taxYear: number): Promise<InstallmentPlanDto> {
    return toInstallmentPlanDto(await this.service.getPlan(tenantId, taxYear));
  }

  /** Forms that a plan with these choices would produce (nothing is saved). */
  @ApiOperation({ summary: 'Modelli F24 che un piano con queste scelte produrrebbe, senza salvare' })
  @Post(':taxYear/preview')
  @HttpCode(200)
  @ApiOkResponse({ type: PlanPreviewDto })
  async preview(@TenantId() tenantId: string, @Param('taxYear', ParseIntPipe) taxYear: number, @Body() dto: PlanParametersDto): Promise<PlanPreviewDto> {
    return toPlanPreviewDto(await this.service.preview(tenantId, taxYear, dto));
  }

  /** Create the plan and its forms from the current tax summary; fails if a plan exists. */
  @ApiOperation({ summary: 'Crea il piano di versamento e i suoi modelli F24' })
  @Post(':taxYear')
  @ApiCreatedResponse({ type: InstallmentPlanDto })
  async create(@TenantId() tenantId: string, @Param('taxYear', ParseIntPipe) taxYear: number, @Body() dto: PlanParametersDto): Promise<InstallmentPlanDto> {
    return toInstallmentPlanDto(await this.service.createPlan(tenantId, taxYear, dto));
  }

  /** Delete the plan and its forms (only when no form is paid or scheduled). */
  @ApiOperation({ summary: 'Elimina il piano e i suoi modelli F24' })
  @Delete(':taxYear')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@TenantId() tenantId: string, @Param('taxYear', ParseIntPipe) taxYear: number): Promise<void> {
    return this.service.deletePlan(tenantId, taxYear);
  }
}
