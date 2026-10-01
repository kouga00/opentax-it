import { ApiProperty } from '@nestjs/swagger';
import { SdiChannel, SdiTransmissionStatus } from '../../../generated/prisma/enums.js';
import { SdiNotificationDto } from './sdi-notification.dto.js';

export class SdiTransmissionDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: SdiChannel }) channel!: SdiChannel;
  @ApiProperty({ description: 'Nome del file inviato' }) fileName!: string;
  @ApiProperty({ enum: SdiTransmissionStatus }) status!: SdiTransmissionStatus;
  @ApiProperty({ type: String, nullable: true, description: 'Data e ora di invio (ISO 8601)' }) sentAt!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Motivo dell\'errore, per l\'utente' }) lastError!: string | null;
  @ApiProperty({ description: 'ISO 8601' }) createdAt!: string;
  @ApiProperty({ type: String, nullable: true, description: 'IdentificativoSdI, dalla prima ricevuta dello SDI' }) sdiId!: string | null;
  @ApiProperty({ type: [SdiNotificationDto], description: 'Ricevute, dalla più recente' }) notifications!: SdiNotificationDto[];
  @ApiProperty({ type: String, nullable: true, description: 'Avviso quando un esito tarda, per l\'utente' }) warning!: string | null;
}
