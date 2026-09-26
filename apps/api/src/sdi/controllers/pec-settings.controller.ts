import { Body, Controller, Get, Put, Sse, type MessageEvent } from '@nestjs/common';
import { ApiOkResponse, ApiProduces } from '@nestjs/swagger';
import { from, map, type Observable } from 'rxjs';
import { PEC_PROVIDERS } from '@opentax-it/fatturapa';
import { TenantId } from '../../common/tenant.decorator.js';
import { SavePecSettingsDto } from '../dto/request/save-pec-settings.dto.js';
import { PecTestEventDto } from '../dto/response/pec-test-event.dto.js';
import { PecProviderDto } from '../dto/response/pec-provider.dto.js';
import { PecSettingsDto } from '../dto/response/pec-settings.dto.js';
import { toPecProviderDto, toPecSettingsDto, toPecTestMessage } from '../mappers/pec-settings.mapper.js';
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

  /**
   * Logs in to the SMTP and IMAP servers with the saved settings and streams each step as a Server-Sent Event
   * (NestJS @Sse, GET): nothing is sent and nothing is stored.
   */
  @Sse('pec-settings/test')
  @ApiProduces('text/event-stream')
  @ApiOkResponse({ type: PecTestEventDto, description: 'Eventi "step" per ogni passaggio, poi un evento "done"' })
  test(@TenantId() tenantId: string): Observable<MessageEvent> {
    return from(this.service.test(tenantId)).pipe(map(toPecTestMessage));
  }
}
