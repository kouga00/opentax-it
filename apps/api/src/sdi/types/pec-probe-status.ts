/** What happened to the last test PEC sent to SDI, as read from the mailbox. */
export interface PecProbeStatus {
  sentAt: Date | null;
  recipient: string | null;
  /** Acceptance receipt of the sender's provider (Regole tecniche PEC §6.3.3). */
  acceptedAt?: Date;
  /** Delivery receipt: the message reached SDI's mailbox (§6.5.2). */
  deliveredAt?: Date;
  /** Non-acceptance or delivery error of the provider, for the user. */
  providerError?: string;
  /** The reply of SDI, e.g. the "messaggio di cortesia" (Spec. 1.9.1 §1.3.1), shown as it is. */
  sdiReply?: { from: string; subject?: string; receivedAt?: Date; text?: string };
}
