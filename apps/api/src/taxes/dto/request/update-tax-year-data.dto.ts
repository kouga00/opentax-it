import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateTaxYearDataDto {
  @IsOptional() @IsNumber() @Min(0) contributionsPaid?: number;
  @IsOptional() @IsNumber() @Min(0) taxAdvancesPaid?: number;
  @IsOptional() @IsNumber() @Min(0) inpsAdvancesPaid?: number;
  @IsOptional() @IsNumber() @Min(0) taxCredits?: number;
  @IsOptional() @IsBoolean() inpsReducedRate?: boolean;
}
