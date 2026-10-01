/** Status of a step of the PEC mailbox test. */
export const PEC_TEST_STEP_STATUSES = ['RUNNING', 'OK', 'FAILED', 'SKIPPED'] as const;
export type PecTestStepStatus = (typeof PEC_TEST_STEP_STATUSES)[number];
