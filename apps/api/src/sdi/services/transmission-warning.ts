import type { SdiTransmission } from '../../generated/prisma/client.js';
import { AWAITING_OUTCOME } from './transmission-statuses.js';

/** A transmission still PENDING after this was probably interrupted between sending and saving. */
const PENDING_TOO_LONG_MS = 15 * 60_000;

/** The rejection receipt arrives "entro 5 giorni dalla corretta ricezione del file" (Spec. 1.9.1 §1.6). */
const NO_OUTCOME_DAYS = 5;

/** Warning shown with a transmission whose outcome is late; null when there is nothing to check. */
export function transmissionWarning(t: SdiTransmission, now = new Date()): string | null {
  if (!AWAITING_OUTCOME.includes(t.status)) return null;
  if (t.status === 'PENDING' && now.getTime() - t.createdAt.getTime() > PENDING_TOO_LONG_MS) {
    return 'Invio non confermato: l\'app si è interrotta durante l\'invio. Se arriva la ricevuta di accettazione del gestore lo stato si aggiorna da solo; altrimenti controlla la posta inviata della casella PEC prima di fare altro.';
  }
  const since = t.sentAt ?? t.createdAt;
  if (now.getTime() - since.getTime() > NO_OUTCOME_DAYS * 86_400_000) {
    return `Nessun esito dello SDI dopo ${NO_OUTCOME_DAYS} giorni: controlla lo stato della fattura sul portale Fatture e Corrispettivi. Lo scarto arriva entro 5 giorni dalla ricezione del file (Specifiche tecniche 1.9.1 §1.6).`;
  }
  return null;
}
