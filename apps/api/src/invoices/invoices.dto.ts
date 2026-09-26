import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsBoolean, IsEnum, IsIn, IsNumber, IsOptional, IsString, Length, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { PAYMENT_METHODS } from '@opentax-it/fatturapa';
import { DocumentType } from '../generated/prisma/enums.js';

export class InvoiceLineDto {
  @IsString() @Length(1, 1000) description!: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100_000) quantity?: number;
  @IsOptional() @IsString() @Length(1, 10) unit?: string;
  /** Bounded so that quantity × price fits the Decimal(14,2) line total. */
  @IsNumber() @Min(-1_000_000) @Max(1_000_000) unitPrice!: number;
}

export class InvoicePaymentDto {
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) dueDate?: string;
  /** ModalitaPagamento (spec 1.9.1): MP05 bank transfer, MP08 card, MP19 SEPA DD, ... */
  @IsOptional() @IsString() @Matches(/^MP\d{2}$/) method?: string;
  @IsOptional() @IsString() @Length(15, 34) iban?: string;
  @IsOptional() @IsString() @Length(8, 11) bic?: string;
}

export class CreateInvoiceDto {
  @IsString() customerId!: string;
  @IsOptional() @IsEnum(DocumentType) type?: DocumentType;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsNumber() @Min(0) exchangeRate?: number;
  @ValidateNested({ each: true }) @Type(() => InvoiceLineDto) @ArrayMinSize(1) @ArrayMaxSize(1000) lines!: InvoiceLineDto[];
  /** Override the tenant default for the 4% INPS surcharge on this invoice. */
  @IsOptional() @IsBoolean() applyInpsSurcharge?: boolean;
  @IsOptional() @ValidateNested() @Type(() => InvoicePaymentDto) payment?: InvoicePaymentDto;
  /** For TD04/TD05: id of the corrected invoice. */
  @IsOptional() @IsString() refInvoiceId?: string;
  /** Payment terms preset; when omitted the tenant default (if any) is used at issue time. */
  @IsOptional() @IsString() paymentTermsId?: string;
  /** Bank account for DatiPagamento; defaults to the tenant default bank. */
  @IsOptional() @IsString() bankAccountId?: string;
  /** ModalitaPagamento asked of the customer; defaults to the method of the payment terms. */
  @IsOptional() @IsIn(Object.keys(PAYMENT_METHODS)) paymentMethod?: string;
  @IsOptional() @IsString() @MaxLength(2000) internalNotes?: string;
}

export class UpdateInvoiceDto extends CreateInvoiceDto {}

export class IssueInvoiceDto {
  @IsOptional() @ValidateNested() @Type(() => InvoicePaymentDto) payment?: InvoicePaymentDto;
  /** Issue even when the projected revenue exceeds 100,000 or the personal limit. */
  @IsOptional() @IsBoolean() confirmThresholds?: boolean;
}

export class ListInvoicesQuery {
  @IsOptional() @Type(() => Number) @IsNumber() year?: number;
  @IsOptional() @IsIn(['DRAFT', 'ISSUED', 'SENT', 'DELIVERED', 'NOT_DELIVERED', 'REJECTED', 'CANCELLED']) status?: string;
}

export interface CourtesyInvoiceParty {
  name: string;
  taxRegime?: string;
  vatNumber?: string;
  fiscalCode?: string;
  address: string;
  postalCode?: string;
  city: string;
  province?: string;
  country: string;
  pec?: string;
}

export interface CourtesyInvoiceSupplier extends CourtesyInvoiceParty {
  taxRegime: string;
}

export interface CourtesyInvoiceLine {
  lineNumber: number;
  description: string;
  quantity?: number;
  unit?: string;
  unitPrice: number;
  totalPrice: number;
  vatRatePct: number;
  vatNature: string;
}

export interface CourtesyInvoicePayment {
  method?: string;
  dueDate?: string;
  iban?: string;
  bic?: string;
}

export interface CourtesyInvoice {
  id: string;
  documentType: string;
  number: string;
  date: string;
  currency: string;
  isDraft: boolean;
  status: string;
  supplier: CourtesyInvoiceSupplier;
  customer: CourtesyInvoiceParty & { recipientCode: string };
  lines: CourtesyInvoiceLine[];
  taxableAmount: number;
  inpsSurcharge: number;
  inpsRatePct?: number;
  vatAmount: number;
  virtualStamp: boolean;
  stampAmount: number;
  total: number;
  payment?: CourtesyInvoicePayment;
  notes: string[];
}
