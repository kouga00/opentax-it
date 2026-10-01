import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/tenant.decorator.js';
import { ReceiptsSyncResultDto } from '../dto/response/receipts-sync-result.dto.js';
import { toReceiptsSyncResultDto } from '../mappers/sdi-transmission.mapper.js';
import { SdiReceiptsSyncService } from '../services/sdi-receipts-sync.service.js';

/** Reading of the SDI receipts from the PEC mailbox, on demand ("Controlla ricevute"). */
@ApiTags('Invio allo SDI')
@Controller('sdi/receipts')
export class SdiReceiptsController {
  constructor(private readonly service: SdiReceiptsSyncService) {}

  /** Reads the new messages of the mailbox and updates the transmissions; the mailbox itself is left untouched. */
  @ApiOperation({ summary: 'Legge le nuove ricevute dalla casella PEC' })
  @Post('sync')
  @HttpCode(200)
  @ApiOkResponse({ type: ReceiptsSyncResultDto })
  async sync(@TenantId() tenantId: string): Promise<ReceiptsSyncResultDto> {
    return toReceiptsSyncResultDto(await this.service.sync(tenantId));
  }
}
