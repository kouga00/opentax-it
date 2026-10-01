/** Advance payments for the following year, as computed by the tax and contribution modules. */
export interface AdvanceSchedule {
  /** Total advance due for the following year. */
  total: number;
  /** First instalment (June/July), 0 when paid in a single instalment or not due. */
  first: number;
  /** Second or single instalment (30 November). */
  second: number;
  mode: 'NOT_DUE' | 'SINGLE' | 'TWO_INSTALMENTS';
}
