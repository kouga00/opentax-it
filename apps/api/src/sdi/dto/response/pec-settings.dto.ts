import { ApiProperty } from '@nestjs/swagger';

/** PEC settings without the password: only whether one is stored. */
export class PecSettingsDto {
  @ApiProperty({ type: String, nullable: true }) provider!: string | null;
  @ApiProperty({ type: String, nullable: true }) address!: string | null;
  @ApiProperty({ type: String, nullable: true }) username!: string | null;
  @ApiProperty({ type: String, nullable: true }) smtpHost!: string | null;
  @ApiProperty({ type: Number, nullable: true }) smtpPort!: number | null;
  @ApiProperty({ type: String, nullable: true }) imapHost!: string | null;
  @ApiProperty({ type: Number, nullable: true }) imapPort!: number | null;
  @ApiProperty() hasPassword!: boolean;
  @ApiProperty({ type: String, nullable: true }) sdiPecAssigned!: string | null;
  @ApiProperty({ description: 'Destinatario del prossimo invio: l\'indirizzo assegnato o sdi01@pec.fatturapa.it' }) recipient!: string;
  @ApiProperty({ description: 'APP_ENCRYPTION_KEY impostata: senza, la password non si può salvare' }) encryptionConfigured!: boolean;
}
