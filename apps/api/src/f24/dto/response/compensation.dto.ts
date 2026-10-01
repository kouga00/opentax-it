import { ApiProperty } from '@nestjs/swagger';
import { COMPENSATION_ORDERS, type CompensationOrder } from '../../types/compensation-order.js';
import { CompensationUsageDto } from './compensation-usage.dto.js';

/** Credits used in the zero-balance form and in which order. */
export class CompensationDto {
  @ApiProperty() used!: number;
  @ApiProperty() unused!: number;
  @ApiProperty({ enum: COMPENSATION_ORDERS }) order!: CompensationOrder;
  @ApiProperty({ type: [CompensationUsageDto] }) usages!: CompensationUsageDto[];
}
