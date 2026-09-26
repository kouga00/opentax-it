/** Steps of a server check: open the encrypted connection, then log in. */
export type ConnectionStep = 'CONNECT' | 'LOGIN';

/** Outcome of connecting to one server of the PEC mailbox; the message is for the user, in Italian. */
export interface ConnectionCheck {
  ok: boolean;
  message: string;
  /** Step that failed; the steps before it succeeded. */
  failedStep?: ConnectionStep;
}
