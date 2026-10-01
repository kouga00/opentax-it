import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class InvoiceLineDto {
  @ApiProperty() @IsString() @Length(1, 1000) description!: string;
  @ApiPropertyOptional({ description: 'Quantità; se manca, 1' }) @IsOptional() @IsNumber() @Min(0) @Max(100_000) quantity?: number;
  @ApiPropertyOptional({ example: 'ore' }) @IsOptional() @IsString() @Length(1, 10) unit?: string;
  /** Bounded so that quantity × price fits the Decimal(14,2) line total. */
  @ApiProperty({ description: 'Prezzo unitario, nella valuta del documento' }) @IsNumber() @Min(-1_000_000) @Max(1_000_000) unitPrice!: number;
}
