import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PecTestStep, PecTestStepStatus } from '../../types/pec-test-event.js';

/**
 * Data of one Server-Sent Event of the PEC test: event type "step" carries step and status, event type "done"
 * carries ok. The message is for the user, in Italian.
 */
export class PecTestEventDto {
  @ApiPropertyOptional({ enum: ['SMTP_CONNECT', 'SMTP_LOGIN', 'IMAP_CONNECT', 'IMAP_LOGIN'] }) step?: PecTestStep;
  @ApiPropertyOptional({ enum: ['RUNNING', 'OK', 'FAILED', 'SKIPPED'] }) status?: PecTestStepStatus;
  @ApiPropertyOptional({ description: 'Solo nell\'evento "done": esito complessivo' }) ok?: boolean;
  @ApiProperty({ required: false }) message?: string;
}
