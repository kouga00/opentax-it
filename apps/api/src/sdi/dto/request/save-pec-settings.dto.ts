import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OTHER_PEC_PROVIDER, PEC_PROVIDERS } from '@opentax-it/fatturapa';
import { IsEmail, IsFQDN, IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min, ValidateIf } from 'class-validator';

const PROVIDER_IDS = [...PEC_PROVIDERS.map((p) => p.id), OTHER_PEC_PROVIDER];
const isOther = (o: SavePecSettingsDto) => o.provider === OTHER_PEC_PROVIDER;

/** Replaces the PEC settings; without `password` the stored one is kept. The servers are needed only for "OTHER". */
export class SavePecSettingsDto {
  @ApiProperty({ enum: PROVIDER_IDS }) @IsIn(PROVIDER_IDS) provider!: string;
  @ApiProperty({ description: 'Indirizzo PEC mittente' }) @IsEmail() @MaxLength(256) address!: string;
  @ApiPropertyOptional({ description: 'Nome utente, se diverso dall\'indirizzo' }) @IsOptional() @IsString() @Length(1, 256) username?: string;
  @ApiPropertyOptional({ description: 'Password della casella; se assente resta quella salvata', writeOnly: true }) @IsOptional() @IsString() @Length(1, 256) password?: string;
  @ApiPropertyOptional() @ValidateIf(isOther) @IsFQDN() smtpHost?: string;
  @ApiPropertyOptional() @ValidateIf(isOther) @IsInt() @Min(1) @Max(65535) smtpPort?: number;
  @ApiPropertyOptional() @ValidateIf(isOther) @IsFQDN() imapHost?: string;
  @ApiPropertyOptional() @ValidateIf(isOther) @IsInt() @Min(1) @Max(65535) imapPort?: number;
  @ApiPropertyOptional({ type: String, nullable: true, description: 'Indirizzo PEC assegnato dallo SDI nella risposta al primo invio' })
  @IsOptional() @IsEmail() @MaxLength(256) sdiPecAssigned?: string | null;
}
