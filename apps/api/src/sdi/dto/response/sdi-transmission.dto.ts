import { ApiProperty } from '@nestjs/swagger';
import { SdiChannel, SdiTransmissionStatus } from '../../../generated/prisma/enums.js';

export class SdiTransmissionDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: SdiChannel }) channel!: SdiChannel;
  @ApiProperty({ description: 'Nome del file inviato' }) fileName!: string;
  @ApiProperty({ enum: SdiTransmissionStatus }) status!: SdiTransmissionStatus;
  @ApiProperty({ type: String, nullable: true, description: 'Data e ora di invio (ISO 8601)' }) sentAt!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Motivo dell\'errore, per l\'utente' }) lastError!: string | null;
  @ApiProperty({ description: 'ISO 8601' }) createdAt!: string;
}
