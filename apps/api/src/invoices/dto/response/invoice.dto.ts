import { ApiProperty } from '@nestjs/swagger';
import { DocumentType, InvoiceStatus, VatNature } from '../../../generated/prisma/enums.js';
import { InvoiceCustomerDto } from './invoice-customer.dto.js';

/** A document in the list; the detail adds the lines (InvoiceDetailDto). */
export class InvoiceDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: DocumentType }) type!: DocumentType;
  @ApiProperty() year!: number;
  @ApiProperty({ description: 'Numero assegnato all\'emissione; vuoto per le bozze' }) number!: string;
  @ApiProperty({ description: 'AAAA-MM-GG' }) date!: string;
  @ApiProperty({ example: 'EUR' }) currency!: string;
  @ApiProperty({ description: 'Euro per unità della valuta (1 per l\'euro)' }) exchangeRate!: number;
  @ApiProperty({ enum: VatNature }) vatNature!: VatNature;
  @ApiProperty() taxableAmount!: number;
  @ApiProperty({ description: 'Rivalsa INPS' }) inpsSurcharge!: number;
  @ApiProperty() virtualStamp!: boolean;
  @ApiProperty() stampAmount!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [String] }) notes!: string[];
  @ApiProperty({ enum: InvoiceStatus }) status!: InvoiceStatus;
  @ApiProperty({ type: String, nullable: true }) refInvoiceId!: string | null;
  @ApiProperty({ type: String, nullable: true }) paymentTermsId!: string | null;
  @ApiProperty({ type: String, nullable: true }) bankAccountId!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'ModalitaPagamento, es. MP05' }) paymentMethod!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Nome del file XML inviato allo SDI' }) xmlFileName!: string | null;
  @ApiProperty({ description: 'Importata da un XML emesso e inviato allo SDI con un altro strumento' }) imported!: boolean;
  @ApiProperty({ description: 'Emessa ai fini fiscali: consegnata o messa a disposizione dallo SDI, oppure importata' }) issued!: boolean;
  @ApiProperty({ type: String, nullable: true }) internalNotes!: string | null;
  @ApiProperty({ type: InvoiceCustomerDto }) customer!: InvoiceCustomerDto;
}
