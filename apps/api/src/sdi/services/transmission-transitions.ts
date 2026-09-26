import type { PecCertificationType, SdiReceipt } from '@opentax-it/fatturapa';
import type { InvoiceStatus, SdiTransmissionStatus } from '../../generated/prisma/enums.js';
import { SDI_OUTCOMES } from './transmission-statuses.js';

/**
 * How a receipt moves a transmission and its invoice, as pure functions: statuses only go forward, and an SDI
 * outcome is never overridden by a late provider receipt.
 *
 * - SDI receipts (Spec. 1.9.1 §1.5.7): RC delivered, MC made available to the customer (the invoice is issued), NS
 *   rejected ("la fattura non è mai stata emessa", AdE).
 * - Provider receipts (Regole tecniche PEC §6.3.3, §6.5): acceptance and delivery to SDI's mailbox attest the
 *   transmission only; non-acceptance, delivery error and virus mean the file never reached SDI, so the invoice can
 *   be sent again.
 */

export interface Transition {
  transmission: { status: SdiTransmissionStatus; sentAt?: Date; pecProviderId?: string; lastError?: string; sdiId?: string };
  /** REOPEN puts a sent invoice back to issued; otherwise the outcome to give the invoice. */
  invoice?: 'REOPEN' | InvoiceStatus;
}

const SDI_STATUS: Record<SdiReceipt['type'], { transmission: SdiTransmissionStatus; invoice: InvoiceStatus }> = {
  RC: { transmission: 'SDI_DELIVERED', invoice: 'DELIVERED' },
  MC: { transmission: 'SDI_NOT_DELIVERED', invoice: 'NOT_DELIVERED' },
  NS: { transmission: 'SDI_REJECTED', invoice: 'REJECTED' },
};

const PROVIDER_FAILURES: Partial<Record<PecCertificationType, string>> = {
  'non-accettazione': 'Il gestore PEC non ha accettato il messaggio.',
  'errore-consegna': 'Il messaggio non è stato consegnato alla casella dello SDI.',
  'rilevazione-virus': 'Il gestore PEC ha rilevato un virus nel messaggio, che non è stato consegnato.',
};

/** Undefined when the transmission already has an SDI outcome: SDI sends one per file, a second one is only recorded. */
export function sdiReceiptTransition(current: { status: SdiTransmissionStatus }, receipt: SdiReceipt): Transition | undefined {
  if (SDI_OUTCOMES.includes(current.status)) return undefined;
  const outcome = SDI_STATUS[receipt.type];
  const errors = receipt.errors.map((e) => `${e.code}${e.description ? ` ${e.description}` : ''}`).join('; ');
  return {
    transmission: { status: outcome.transmission, sdiId: receipt.sdiId, ...(receipt.type === 'NS' ? { lastError: errors || 'Scartata dallo SDI' } : {}) },
    invoice: outcome.invoice,
  };
}

/** Undefined when the receipt only needs recording (e.g. a warning, or anything after the SDI outcome). */
export function providerReceiptTransition(
  current: { status: SdiTransmissionStatus; sentAt: Date | null },
  receipt: { type: PecCertificationType; providerId?: string; error?: string },
  receivedAt: Date,
): Transition | undefined {
  if (SDI_OUTCOMES.includes(current.status)) return undefined;
  if (receipt.type === 'accettazione' && (current.status === 'PENDING' || current.status === 'SENT')) {
    // Also closes a transmission left PENDING by a stop right after sending: the provider accepted it.
    return { transmission: { status: 'ACCEPTED_BY_PEC', sentAt: current.sentAt ?? receivedAt, pecProviderId: receipt.providerId } };
  }
  if (receipt.type === 'avvenuta-consegna' && current.status !== 'ERROR') {
    return { transmission: { status: 'DELIVERED_TO_SDI', sentAt: current.sentAt ?? receivedAt } };
  }
  const failure = PROVIDER_FAILURES[receipt.type];
  if (failure && current.status !== 'ERROR') {
    return { transmission: { status: 'ERROR', lastError: receipt.error ? `${failure} ${receipt.error}` : failure }, invoice: 'REOPEN' };
  }
  return undefined;
}
