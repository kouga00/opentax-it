import { ApiProperty } from '@nestjs/swagger';
import { F24Status } from '../../../generated/prisma/enums.js';

/** The F24 that pays a stamp duty quarter. */
export class StampDutyF24RefDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: F24Status }) status!: F24Status;
  @ApiProperty({ description: 'AAAA-MM-GG' }) paymentDate!: string;
  @ApiProperty({ type: String, nullable: true, description: 'AAAA-MM-GG' }) paidOn!: string | null;
}
