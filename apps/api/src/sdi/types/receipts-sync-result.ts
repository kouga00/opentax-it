/** Outcome of reading the PEC mailbox for receipts. */
export interface ReceiptsSyncResult {
  /** DONE; BUSY when another sync of the same tenant is running; NOT_CONFIGURED; ERROR when the mailbox could not be read. */
  status: 'DONE' | 'BUSY' | 'NOT_CONFIGURED' | 'ERROR';
  /** Messages read from the inbox. */
  read: number;
  /** Messages that concerned one of our transmissions. */
  matched: number;
  message?: string;
}
