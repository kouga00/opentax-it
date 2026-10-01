import { ApiProperty } from '@nestjs/swagger';
import { CustomerKind } from '../../../generated/prisma/enums.js';

/** The customer of a document, as much as a list or a detail page shows. */
export class InvoiceCustomerDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: CustomerKind }) kind!: CustomerKind;
  @ApiProperty({ type: String, nullable: true }) businessName!: string | null;
  @ApiProperty({ type: String, nullable: true }) firstName!: string | null;
  @ApiProperty({ type: String, nullable: true }) lastName!: string | null;
}
