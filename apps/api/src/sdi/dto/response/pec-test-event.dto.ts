import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PEC_TEST_STEP_STATUSES, type PecTestStepStatus } from '../../types/pec-test-step-status.js';
import { PEC_TEST_STEPS, type PecTestStep } from '../../types/pec-test-step.js';

/**
 * Data of one Server-Sent Event of the PEC test: event type "step" carries step and status, event type "done"
 * carries ok. The message is for the user, in Italian.
 */
export class PecTestEventDto {
  @ApiPropertyOptional({ enum: PEC_TEST_STEPS }) step?: PecTestStep;
  @ApiPropertyOptional({ enum: PEC_TEST_STEP_STATUSES }) status?: PecTestStepStatus;
  @ApiPropertyOptional({ description: 'Solo nell\'evento "done": esito complessivo' }) ok?: boolean;
  @ApiProperty({ required: false }) message?: string;
}
