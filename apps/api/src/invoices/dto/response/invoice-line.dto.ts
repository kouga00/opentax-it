import { ApiProperty } from '@nestjs/swagger';

export class InvoiceLineResponseDto {
  @ApiProperty() lineNumber!: number;
  @ApiProperty() description!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty({ type: String, nullable: true }) unit!: string | null;
  @ApiProperty() unitPrice!: number;
  @ApiProperty() totalPrice!: number;
}
