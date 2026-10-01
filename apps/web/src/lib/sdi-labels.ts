import type { SdiTransmission, SdiTransmissionStatus } from './types';

/** Status of a transmission to SDI, for the user. */
const TRANSMISSION_LABELS: Record<SdiTransmissionStatus, string> = {
  PENDING: 'In invio',
  SENT: 'Inviata via PEC',
  ACCEPTED_BY_PEC: 'Accettata dal gestore PEC',
  DELIVERED_TO_SDI: 'Consegnata allo SDI',
  SDI_DELIVERED: 'Consegnata al cliente',
  SDI_NOT_DELIVERED: 'Messa a disposizione',
  SDI_REJECTED: 'Scartata',
  ERROR: 'Invio non riuscito',
};

export const transmissionLabel = (t: Pick<SdiTransmission, 'status' | 'channel'>): string =>
  t.channel === 'OTHER' && t.status === 'SENT' ? 'Inviata con un altro strumento' : TRANSMISSION_LABELS[t.status];

/** Messages about a transmission: from SDI (Spec. 1.9.1 §1.5.7) and from the PEC provider (Regole tecniche PEC §6). */
export const NOTIFICATION_LABELS: Record<string, string> = {
  RC: 'Ricevuta di consegna dello SDI: fattura consegnata al cliente',
  NS: 'Ricevuta di scarto dello SDI: la fattura non è stata emessa',
  MC: 'Impossibilità di recapito: la fattura è emessa ed è a disposizione del cliente nella sua area riservata',
  PEC_ACCETTAZIONE: 'Accettazione del tuo gestore PEC',
  PEC_AVVENUTA_CONSEGNA: 'Consegna alla casella PEC dello SDI',
  PEC_PRESA_IN_CARICO: 'Presa in carico dal gestore dello SDI',
  PEC_PREAVVISO_ERRORE_CONSEGNA: 'Preavviso di mancata consegna del gestore PEC',
  PEC_ERRORE_CONSEGNA: 'Mancata consegna alla casella dello SDI',
  PEC_NON_ACCETTAZIONE: 'Messaggio non accettato dal tuo gestore PEC',
};
