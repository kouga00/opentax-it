import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { CustomerKind } from '../../../generated/prisma/enums.js';

export class SaveCustomerDto {
  @IsEnum(CustomerKind) kind!: CustomerKind;
  @IsOptional() @IsString() @Length(1, 80) businessName?: string;
  @IsOptional() @IsString() @Length(1, 60) firstName?: string;
  @IsOptional() @IsString() @Length(1, 60) lastName?: string;
  @IsOptional() @IsString() @Length(1, 28) vatNumber?: string;
  @IsOptional() @IsString() @Length(11, 16) fiscalCode?: string;
  @IsOptional() @IsString() @Matches(/^[A-Z]{2}$/) countryCode?: string;
  @IsString() @Length(1, 60) address!: string;
  @IsOptional() @IsString() @Length(1, 5) postalCode?: string;
  @IsString() @Length(1, 60) city!: string;
  @IsOptional() @IsString() @Length(2, 2) province?: string;
  @IsOptional() @IsString() @Matches(/^[A-Z]{2}$/) country?: string;
  @IsOptional() @IsString() @Matches(/^[A-Z0-9]{6,7}$/) recipientCode?: string;
  /** PECDestinatario: EmailType of the FatturaPA XSD, max 256 characters. */
  @IsOptional() @IsEmail() @MaxLength(256) recipientPec?: string;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  /** NON_EU_B2C only: services listed in art. 7-septies DPR 633/72. */
  @IsOptional() @IsBoolean() art7SeptiesServices?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

