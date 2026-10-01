import { ApiProperty } from '@nestjs/swagger';
import { ReturnRowDto } from './return-row.dto.js';

/** A form of the return (quadro) with its rows. */
export class ReturnFormDto {
  @ApiProperty({ enum: ['LM', 'RR', 'RX'], description: 'Quadro della dichiarazione' }) id!: string;
  @ApiProperty({ type: [ReturnRowDto] }) rows!: ReturnRowDto[];
}
