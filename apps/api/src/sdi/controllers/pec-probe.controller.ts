import { Controller, Get, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/tenant.decorator.js';
import { PecProbeStatusDto } from '../dto/response/pec-probe-status.dto.js';
import { toPecProbeStatusDto } from '../mappers/pec-probe.mapper.js';
import { PecSdiProbeService } from '../services/pec-sdi-probe.service.js';

/** Test PEC without attachment to SDI, which answers with a "messaggio di cortesia" (Spec. 1.9.1 §1.3.1). */
@ApiTags('Invio allo SDI')
@Controller('sdi/pec-probe')
export class PecProbeController {
  constructor(private readonly service: PecSdiProbeService) {}

  /** Sends the test PEC: a real message to SDI, with no invoice. */
  @ApiOperation({ summary: 'Invia la PEC di prova allo SDI, senza fatture' })
  @Post()
  @ApiCreatedResponse({ type: PecProbeStatusDto })
  async send(@TenantId() tenantId: string): Promise<PecProbeStatusDto> {
    return toPecProbeStatusDto(await this.service.send(tenantId));
  }

  /** The replies to the last test found in the mailbox so far; the mailbox is read, not changed. */
  @ApiOperation({ summary: 'Risposte all\'ultima PEC di prova' })
  @Get()
  @ApiOkResponse({ type: PecProbeStatusDto })
  async status(@TenantId() tenantId: string): Promise<PecProbeStatusDto> {
    return toPecProbeStatusDto(await this.service.status(tenantId));
  }
}
