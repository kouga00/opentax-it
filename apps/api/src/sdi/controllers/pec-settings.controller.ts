import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { PEC_PROVIDERS } from '@opentax-it/fatturapa';
import { TenantId } from '../../common/tenant.decorator.js';
import { SavePecSettingsDto } from '../dto/request/save-pec-settings.dto.js';
import { PecConnectionTestDto } from '../dto/response/pec-connection-test.dto.js';
import { PecProviderDto } from '../dto/response/pec-provider.dto.js';
import { PecSettingsDto } from '../dto/response/pec-settings.dto.js';
import { toPecConnectionTestDto, toPecProviderDto, toPecSettingsDto } from '../mappers/pec-settings.mapper.js';
import { PecSettingsService } from '../services/pec-settings.service.js';

/** PEC mailbox for the SDI channel: preset providers, settings of the tenant and a login test. */
@Controller('sdi')
export class PecSettingsController {
  constructor(private readonly service: PecSettingsService) {}

  @Get('pec-providers')
  @ApiOkResponse({ type: [PecProviderDto] })
  providers(): PecProviderDto[] {
    return PEC_PROVIDERS.map(toPecProviderDto);
  }

  @Get('pec-settings')
  @ApiOkResponse({ type: PecSettingsDto })
  async get(@TenantId() tenantId: string): Promise<PecSettingsDto> {
    return toPecSettingsDto(await this.service.get(tenantId));
  }

  @Put('pec-settings')
  @ApiOkResponse({ type: PecSettingsDto })
  async save(@TenantId() tenantId: string, @Body() dto: SavePecSettingsDto): Promise<PecSettingsDto> {
    return toPecSettingsDto(await this.service.save(tenantId, dto));
  }

  /** Logs in to the SMTP and IMAP servers with the saved settings; nothing is sent. */
  @Post('pec-settings/test')
  @HttpCode(200)
  @ApiOkResponse({ type: PecConnectionTestDto })
  async test(@TenantId() tenantId: string): Promise<PecConnectionTestDto> {
    return toPecConnectionTestDto(await this.service.test(tenantId));
  }
}
