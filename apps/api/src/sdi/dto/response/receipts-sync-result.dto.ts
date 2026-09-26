import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReceiptsSyncResultDto {
  @ApiProperty({ enum: ['DONE', 'BUSY', 'NOT_CONFIGURED', 'ERROR'] }) status!: 'DONE' | 'BUSY' | 'NOT_CONFIGURED' | 'ERROR';
  @ApiProperty({ description: 'Messaggi letti dalla casella' }) read!: number;
  @ApiProperty({ description: 'Messaggi relativi ai nostri invii' }) matched!: number;
  @ApiPropertyOptional({ description: 'Motivo, per l\'utente' }) message?: string;
}
