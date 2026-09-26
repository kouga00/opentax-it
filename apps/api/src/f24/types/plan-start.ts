/** Due date of the balance and first advance: which of the rule set's dates to use. */
export const PLAN_STARTS = ['ORDINARY', 'EXTENDED', 'DEFERRED', 'DEFERRED_EXTENDED'] as const;

export type PlanStart = (typeof PLAN_STARTS)[number];
