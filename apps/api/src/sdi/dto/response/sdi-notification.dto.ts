import { ApiProperty } from '@nestjs/swagger';

/** A receipt about a transmission: from SDI (RC, NS, MC) or from the PEC provider (PEC_ACCETTAZIONE...). */
export class SdiNotificationDto {
  @ApiProperty() type!: string;
  @ApiProperty({ description: 'ISO 8601' }) receivedAt!: string;
  @ApiProperty({ type: String, nullable: true, description: 'IdentificativoSdI' }) sdiId!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Nome del file della ricevuta SDI' }) fileName!: string | null;
}
