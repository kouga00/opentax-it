import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RECEIPTS_SYNC_STATUSES } from '../../types/receipts-sync-result.js';

export class ReceiptsSyncResultDto {
  @ApiProperty({ enum: RECEIPTS_SYNC_STATUSES }) status!: (typeof RECEIPTS_SYNC_STATUSES)[number];
  @ApiProperty({ description: 'Messaggi letti dalla casella' }) read!: number;
  @ApiProperty({ description: 'Messaggi relativi ai nostri invii' }) matched!: number;
  @ApiPropertyOptional({ description: 'Motivo, per l\'utente' }) message?: string;
}
