import { ApiProperty } from '@nestjs/swagger';
import { DocumentType, InvoiceStatus, VatNature } from '../../../generated/prisma/enums.js';
import { InvoiceCustomerDto } from './invoice-customer.dto.js';
import { InvoiceLinkDto } from './invoice-link.dto.js';

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
  @ApiProperty({ type: String, nullable: true, description: 'Cassa professionale (TipoCassa TC01-TC21)' }) professionalFundType!: string | null;
  @ApiProperty({ type: Number, nullable: true, description: 'Aliquota del contributo di cassa, in percentuale' }) professionalFundRatePct!: number | null;
  @ApiProperty({ description: 'Contributo di cassa addebitato al cliente: non è un ricavo' }) professionalFundContribution!: number;
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
  @ApiProperty({ description: 'Bozza di una fattura scartata dallo SDI, da correggere e reinviare con lo stesso numero e la stessa data' }) correction!: boolean;
  @ApiProperty({ nullable: true, type: String, description: 'Fattura scartata che questa sostituisce con un nuovo numero e una nuova data' }) replacesInvoiceId!: string | null;
  @ApiProperty({ nullable: true, type: InvoiceLinkDto, description: 'Fattura che sostituisce questa, scartata, con un nuovo numero e una nuova data' }) replacedBy!: InvoiceLinkDto | null;
  @ApiProperty({ nullable: true, type: String, description: 'Giorno di consegna (RC) o di messa a disposizione (MC) dello SDI, YYYY-MM-DD: decide il trimestre del bollo' }) sdiDeliveredOn!: string | null;
  @ApiProperty({ type: String, nullable: true }) internalNotes!: string | null;
  @ApiProperty({ type: InvoiceCustomerDto }) customer!: InvoiceCustomerDto;
}
