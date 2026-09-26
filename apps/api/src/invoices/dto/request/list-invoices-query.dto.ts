import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { InvoiceStatus } from '../../../generated/prisma/enums.js';

export class ListInvoicesQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() year?: number;
  @ApiPropertyOptional({ enum: InvoiceStatus }) @IsOptional() @IsEnum(InvoiceStatus) status?: InvoiceStatus;
}
