import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SdiReplyDto } from './sdi-reply.dto.js';

/** What happened to the last test PEC sent to SDI, read from the mailbox. */
export class PecProbeStatusDto {
  @ApiProperty({ type: String, nullable: true, description: 'Invio della prova (ISO 8601); null se non è mai stata inviata' }) sentAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) recipient!: string | null;
  @ApiPropertyOptional({ description: 'Ricevuta di accettazione del gestore (ISO 8601)' }) acceptedAt?: string;
  @ApiPropertyOptional({ description: 'Ricevuta di consegna alla casella dello SDI (ISO 8601)' }) deliveredAt?: string;
  @ApiPropertyOptional({ description: 'Errore del gestore PEC, per l\'utente' }) providerError?: string;
  @ApiPropertyOptional({ type: SdiReplyDto, description: 'Risposta dello SDI, ad esempio il messaggio di cortesia' }) sdiReply?: SdiReplyDto;
}
