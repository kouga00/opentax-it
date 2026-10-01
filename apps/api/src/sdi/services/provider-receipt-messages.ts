import type { PecCertificationType } from '@opentax-it/fatturapa';

/**
 * Receipts of the sender's own PEC provider meaning the message did not reach SDI's mailbox, with the message for
 * the user (Regole tecniche PEC, allegato al DM 2/11/2005): non-acceptance (§6.3.2) and delivery error (§6.5.3; a
 * virus found at the destination also reaches the sender as a delivery error, §6.4.3.3).
 */
export const PROVIDER_FAILURE_MESSAGES: Partial<Record<PecCertificationType, string>> = {
  'non-accettazione': 'Il tuo gestore PEC non ha accettato il messaggio.',
  'errore-consegna': 'Il messaggio non è stato consegnato alla casella dello SDI.',
};

/** Notice of a delivery not confirmed within the maximum time (§6.3.5): a warning, not yet a failure. */
export const PROVIDER_DELAY_MESSAGE = 'Il gestore dello SDI non ha ancora confermato la consegna (preavviso di mancata consegna).';
