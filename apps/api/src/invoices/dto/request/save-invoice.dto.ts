import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsBoolean, IsEnum, IsIn, IsNumber, IsOptional, IsString, Length, Matches, MaxLength, Min, ValidateNested } from 'class-validator';
import { PAYMENT_METHODS } from '@opentax-it/fatturapa';
import { DocumentType } from '../../../generated/prisma/enums.js';
import { InvoiceLineDto } from './invoice-line.dto.js';
import { InvoicePaymentDto } from './invoice-payment.dto.js';

/** A draft to create (POST) or to replace (PUT): every field is sent each time. */
export class SaveInvoiceDto {
  @ApiProperty() @IsString() customerId!: string;
  @ApiPropertyOptional({ enum: DocumentType, description: 'Se manca, TD01' }) @IsOptional() @IsEnum(DocumentType) type?: DocumentType;
  @ApiProperty({ description: 'Data del documento (AAAA-MM-GG)' }) @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
  @ApiPropertyOptional({ description: 'Valuta; se manca, quella del cliente' }) @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @ApiPropertyOptional({ description: 'Euro per unità della valuta (art. 13 c. 4 DPR 633/72); obbligatorio in valuta' }) @IsOptional() @IsNumber() @Min(0) exchangeRate?: number;
  @ApiProperty({ type: [InvoiceLineDto] }) @ValidateNested({ each: true }) @Type(() => InvoiceLineDto) @ArrayMinSize(1) @ArrayMaxSize(1000) lines!: InvoiceLineDto[];
  /** Override the tenant default for the INPS surcharge on this invoice. */
  @ApiPropertyOptional({ description: 'Rivalsa INPS; se manca, come da profilo' }) @IsOptional() @IsBoolean() applyInpsSurcharge?: boolean;
  @ApiPropertyOptional({ type: InvoicePaymentDto }) @IsOptional() @ValidateNested() @Type(() => InvoicePaymentDto) payment?: InvoicePaymentDto;
  /** For TD04/TD05: id of the corrected invoice. */
  @ApiPropertyOptional({ description: 'Documento corretto, per note di credito e di debito' }) @IsOptional() @IsString() refInvoiceId?: string;
  /** Payment terms preset; when omitted the tenant default (if any) is used at issue time. */
  @ApiPropertyOptional() @IsOptional() @IsString() paymentTermsId?: string;
  /** Bank account for DatiPagamento; defaults to the tenant default bank. */
  @ApiPropertyOptional() @IsOptional() @IsString() bankAccountId?: string;
  /** ModalitaPagamento asked of the customer; defaults to the method of the payment terms. */
  @ApiPropertyOptional({ enum: Object.keys(PAYMENT_METHODS) }) @IsOptional() @IsIn(Object.keys(PAYMENT_METHODS)) paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) internalNotes?: string;
}
