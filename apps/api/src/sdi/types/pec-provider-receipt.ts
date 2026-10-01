import type { PecCertificationType } from '@opentax-it/fatturapa';

/** A receipt of the sender's own PEC provider about a message we sent (acceptance, delivery, errors). */
export interface PecProviderReceipt {
  kind: 'provider-receipt';
  type: PecCertificationType;
  /** Message-ID we gave the message, from X-Riferimento-Message-ID or daticert.xml "msgid". */
  originalMessageId?: string;
  /** Subject of the original message: the invoice file name, used when the Message-ID is missing. */
  originalSubject?: string;
  /** Provider's identifier of the original message (daticert.xml "identificativo"). */
  providerId?: string;
  /** Date header of the receipt (the event date, Regole tecniche PEC §6.3.3). */
  date?: string;
  /** Provider's description of an error, if any. */
  error?: string;
}
