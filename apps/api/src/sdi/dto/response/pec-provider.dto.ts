import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PecProviderDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() smtpHost!: string;
  @ApiProperty() smtpPort!: number;
  @ApiProperty() imapHost!: string;
  @ApiProperty() imapPort!: number;
  @ApiPropertyOptional() usernameHint?: string;
  @ApiPropertyOptional() passwordHint?: string;
  @ApiProperty({ description: 'Pagina ufficiale del gestore con i parametri' }) sourceUrl!: string;
  @ApiProperty({ description: 'AAAA-MM-GG' }) verifiedOn!: string;
}
