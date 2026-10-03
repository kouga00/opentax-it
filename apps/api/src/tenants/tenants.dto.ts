import { PAYMENT_METHODS, PROFESSIONAL_FUND_TYPES } from '@opentax-it/fatturapa';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';
import { SocialSecurityScheme } from '../generated/prisma/enums.js';

export class CreateTenantDto {
  @IsString() @Length(1, 120) name!: string;

  @IsOptional() @IsString() @Length(1, 80) businessName?: string;
  @IsString() @Length(1, 60) firstName!: string;
  @IsString() @Length(1, 60) lastName!: string;
  @IsString() @Matches(/^[A-Z0-9]{16}$/, { message: 'fiscalCode must be 16 alphanumeric characters' }) fiscalCode!: string;
  @IsString() @Matches(/^\d{11}$/, { message: 'vatNumber must be 11 digits' }) vatNumber!: string;
  @IsString() @Matches(/^\d{2}(\.\d{1,2}){0,2}$/, { message: 'atecoCode must look like 62.02 or 62.02.00' }) atecoCode!: string;
  @IsString() @Length(1, 60) address!: string;
  @IsString() @Matches(/^\d{5}$/) postalCode!: string;
  @IsString() @Length(1, 60) city!: string;
  @IsString() @Length(2, 2) province!: string;
  @IsInt() @Min(1990) activityStartYear!: number;
  @IsOptional() @IsBoolean() reducedRate?: boolean;
  @IsOptional() @IsEnum(SocialSecurityScheme) socialSecurityScheme?: SocialSecurityScheme;
  @IsOptional() @IsBoolean() inpsFlatRateReduction?: boolean;
  @IsOptional() @IsBoolean() inpsSeniorityBefore1996?: boolean;
  @IsOptional() @IsBoolean() applyInpsSurcharge?: boolean;
  /** Professional fund (TipoCassa TC01-TC21) and rate of the contribution charged on invoices; null removes them. */
  @IsOptional() @IsIn(PROFESSIONAL_FUND_TYPES) professionalFundType?: string | null;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100) professionalFundRatePct?: number | null;
  @IsOptional() @IsBoolean() isaSubject?: boolean;
  /** Personal revenue limit for the year; null removes it. */
  @IsOptional() @IsNumber() @Min(1) @Max(1_000_000) revenueLimit?: number | null;
  /** First progressive of the SDI file names (1-5 alphanumeric); null removes it. */
  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9]{1,5}$/) sdiFileProgressiveStart?: string | null;
  @IsOptional() @IsBoolean() viesRegistered?: boolean;
  @IsOptional() @IsString() @Matches(/^\d{4}-[a-z0-9-]+$/) inpsOfficeId?: string;
  @IsOptional() @IsString() @Matches(/^(\d{4}-\d{2}-\d{2})?$/) birthDate?: string;
  @IsOptional() @IsString() @Matches(/^[MF]?$/) sex?: string;
  @IsOptional() @IsString() @Length(0, 60) birthPlace?: string;
  @IsOptional() @IsString() @Matches(/^([A-Z]{2})?$/) birthProvince?: string;
}

export class UpdateTenantProfileDto {
  @IsOptional() @IsString() @Length(1, 120) name?: string;
  @IsOptional() @IsString() @Length(1, 80) businessName?: string;
  @IsOptional() @IsString() @Length(1, 60) firstName?: string;
  @IsOptional() @IsString() @Length(1, 60) lastName?: string;
  @IsOptional() @IsString() @Matches(/^[A-Z0-9]{16}$/) fiscalCode?: string;
  @IsOptional() @IsString() @Matches(/^\d{11}$/) vatNumber?: string;
  @IsOptional() @IsString() @Matches(/^\d{2}(\.\d{1,2}){0,2}$/) atecoCode?: string;
  @IsOptional() @IsString() @Length(1, 60) address?: string;
  @IsOptional() @IsString() @Matches(/^\d{5}$/) postalCode?: string;
  @IsOptional() @IsString() @Length(1, 60) city?: string;
  @IsOptional() @IsString() @Length(2, 2) province?: string;
  @IsOptional() @IsInt() @Min(1990) activityStartYear?: number;
  @IsOptional() @IsBoolean() reducedRate?: boolean;
  @IsOptional() @IsEnum(SocialSecurityScheme) socialSecurityScheme?: SocialSecurityScheme;
  @IsOptional() @IsBoolean() inpsFlatRateReduction?: boolean;
  @IsOptional() @IsBoolean() inpsSeniorityBefore1996?: boolean;
  @IsOptional() @IsBoolean() applyInpsSurcharge?: boolean;
  /** Professional fund (TipoCassa TC01-TC21) and rate of the contribution charged on invoices; null removes them. */
  @IsOptional() @IsIn(PROFESSIONAL_FUND_TYPES) professionalFundType?: string | null;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(100) professionalFundRatePct?: number | null;
  @IsOptional() @IsBoolean() isaSubject?: boolean;
  /** Personal revenue limit for the year; null removes it. */
  @IsOptional() @IsNumber() @Min(1) @Max(1_000_000) revenueLimit?: number | null;
  /** First progressive of the SDI file names (1-5 alphanumeric); null removes it. */
  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9]{1,5}$/) sdiFileProgressiveStart?: string | null;
  @IsOptional() @IsBoolean() viesRegistered?: boolean;
  @IsOptional() @IsString() @Matches(/^(\d{4}-\d{2}-\d{2})?$/) birthDate?: string;
  @IsOptional() @IsString() @Matches(/^[MF]?$/) sex?: string;
  @IsOptional() @IsString() @Length(0, 60) birthPlace?: string;
  @IsOptional() @IsString() @Matches(/^([A-Z]{2})?$/) birthProvince?: string;
  /** INPS office of the Gestione Separata; '' removes it (the profile form sends it empty when not set). */
  @IsOptional() @IsString() @Matches(/^(\d{4}-[a-z0-9-]+)?$/) inpsOfficeId?: string;
}

export class BankAccountDto {
  @IsString() @Length(1, 60) name!: string;
  @IsOptional() @IsString() @Length(1, 80) bankName?: string;
  @IsString() @Matches(/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/) iban!: string;
  @IsOptional() @IsString() @Matches(/^([A-Z0-9]{8}|[A-Z0-9]{11})?$/) bic?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class PaymentTermsDto {
  @IsString() @Length(1, 60) name!: string;
  /** Days of each installment (e.g. [30, 60, 90]): one DettaglioPagamento each (Spec. FatturaPA 1.9.1 §2.1.10). */
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(12) @IsInt({ each: true }) @Min(0, { each: true }) @Max(365, { each: true }) dueDays!: number[];
  /** "Fine mese": each due date moves to the last day of its month. */
  @IsOptional() @IsBoolean() fromMonthEnd?: boolean;
  @IsOptional() @IsIn(Object.keys(PAYMENT_METHODS)) method?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
