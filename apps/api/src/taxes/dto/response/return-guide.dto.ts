import { ApiProperty } from '@nestjs/swagger';
import { ReturnRevenueDto } from './return-revenue.dto.js';
import { FiledReturnDto } from './filed-return.dto.js';
import { ReturnFormDto } from './return-form.dto.js';

/** Guide to the pre-filled Redditi PF: the LM, RR and RX forms. */
export class ReturnGuideDto {
  @ApiProperty() year!: number;
  @ApiProperty({ type: [ReturnFormDto], description: 'Quadri LM, RR (se la gestione è calcolata) e RX' }) forms!: ReturnFormDto[];
  @ApiProperty({ type: ReturnRevenueDto }) revenue!: ReturnRevenueDto;
  @ApiProperty({ type: [String] }) warnings!: string[];
  @ApiProperty({ type: FiledReturnDto, nullable: true, description: 'La dichiarazione segnata come presentata, se lo è' }) filed!: FiledReturnDto | null;
}
