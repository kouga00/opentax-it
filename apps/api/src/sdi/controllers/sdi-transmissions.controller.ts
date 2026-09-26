import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { TenantId } from '../../common/tenant.decorator.js';
import { SdiTransmissionDto } from '../dto/response/sdi-transmission.dto.js';
import { toSdiTransmissionDto } from '../mappers/sdi-transmission.mapper.js';
import { SdiTransmissionsService } from '../services/sdi-transmissions.service.js';

/** Transmissions of an issued invoice to SDI. */
@Controller('invoices/:id/sdi-transmissions')
export class SdiTransmissionsController {
  constructor(private readonly service: SdiTransmissionsService) {}

  @Get()
  @ApiOkResponse({ type: [SdiTransmissionDto] })
  async list(@TenantId() tenantId: string, @Param('id') id: string): Promise<SdiTransmissionDto[]> {
    return (await this.service.list(tenantId, id)).map(toSdiTransmissionDto);
  }

  /** Sends the invoice XML to SDI via PEC. */
  @Post()
  @ApiCreatedResponse({ type: SdiTransmissionDto })
  async send(@TenantId() tenantId: string, @Param('id') id: string): Promise<SdiTransmissionDto> {
    return toSdiTransmissionDto(await this.service.send(tenantId, id));
  }
}
