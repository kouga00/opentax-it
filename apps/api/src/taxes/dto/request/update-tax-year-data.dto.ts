import { ArrayMaxSize, IsArray, IsBoolean, IsNumber, IsOptional, Matches, Min } from 'class-validator';

export class UpdateTaxYearDataDto {
  @IsOptional() @IsNumber() @Min(0) contributionsPaid?: number;
  @IsOptional() @IsNumber() @Min(0) taxAdvancesPaid?: number;
  @IsOptional() @IsNumber() @Min(0) inpsAdvancesPaid?: number;
  @IsOptional() @IsNumber() @Min(0) taxCredits?: number;
  @IsOptional() @IsBoolean() inpsReducedRate?: boolean;
  /** INPS Artigiani/Commercianti: 17-digit INPS codes of the four fixed installments (empty string when unknown). */
  @IsOptional() @IsArray() @ArrayMaxSize(4) @Matches(/^(\d{17})?$/, { each: true }) inpsFixedCodes?: string[];
  /** INPS Artigiani/Commercianti: 17-digit INPS code of the contribution above the minimum; null removes it. */
  @IsOptional() @Matches(/^\d{17}$/) inpsExcessCode?: string | null;
}
