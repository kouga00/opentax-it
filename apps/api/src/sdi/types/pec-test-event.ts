import type { PecTestStepStatus } from './pec-test-step-status.js';
import type { PecTestStep } from './pec-test-step.js';

/** One update of the test, streamed to the page: a step changing status, or the end with the overall result. */
export type PecTestEvent =
  | { kind: 'step'; step: PecTestStep; status: PecTestStepStatus; message?: string }
  | { kind: 'done'; ok: boolean; message?: string };
