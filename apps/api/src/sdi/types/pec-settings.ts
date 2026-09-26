/** PEC settings of a tenant as shown to the user: never the password, only whether one is stored. */
export interface PecSettings {
  provider: string | null;
  address: string | null;
  username: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  imapHost: string | null;
  imapPort: number | null;
  hasPassword: boolean;
  sdiPecAssigned: string | null;
  /** Where the next transmission goes: the assigned address, or sdi01@pec.fatturapa.it before the first one. */
  recipient: string;
  encryptionConfigured: boolean;
  /** Last complete reading of the mailbox for receipts, and the reason of the last failure. */
  lastReceiptsSyncAt: Date | null;
  lastReceiptsSyncError: string | null;
}
