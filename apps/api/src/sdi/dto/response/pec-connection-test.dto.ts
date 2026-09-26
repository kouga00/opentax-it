import { ApiProperty } from '@nestjs/swagger';
import { ConnectionCheckDto } from './connection-check.dto.js';

/** Result of logging in to the PEC mailbox servers, without sending anything. */
export class PecConnectionTestDto {
  @ApiProperty({ type: ConnectionCheckDto }) smtp!: ConnectionCheckDto;
  @ApiProperty({ type: ConnectionCheckDto }) imap!: ConnectionCheckDto;
}
