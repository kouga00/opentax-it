import type { PecCertificationType, SdiReceipt } from '@opentax-it/fatturapa';
import type { SdiTransmissionStatus } from '../../generated/prisma/enums.js';
import { dayInItaly, parseSdiDateTime } from '../../common/italian-date.js';
import type { Transition } from '../types/transition.js';
import { PROVIDER_FAILURE_MESSAGES } from './provider-receipt-messages.js';
import { SDI_OUTCOME_BY_RECEIPT, SDI_OUTCOMES } from './transmission-statuses.js';

/**
 * How a receipt moves a transmission and its invoice, as pure functions: statuses only go forward, and an SDI
 * outcome is never overridden by a late provider receipt.
 *
 * - SDI receipts (Spec. 1.9.1 §1.5.7): RC delivered, MC made available to the customer (the invoice is issued), NS
 *   rejected ("La fattura elettronica [...] contenute nel file si considerano non emesse", §1.6).
 * - Provider receipts (Regole tecniche PEC §6.3.3 acceptance, §6.5.2 delivery): they attest the transmission only.
 *   Non-acceptance and delivery errors (§6.3.2, §6.5.3) mean the file never reached SDI: the invoice can be sent again.
 * - The day that places an issued invoice in a quarter for the stamp duty is the delivery date of the RC or the date
 *   it was made available in the MC (AdE, "L'imposta di bollo sulle fatture elettroniche", June 2026, §2).
 * - An SMTP error can happen after the message has left (e.g. a timeout while waiting for the server's reply): if the
 *   provider then accepts or delivers it, the transmission is taken back from ERROR and the invoice is marked sent.
 */

/** Undefined when the transmission already has an SDI outcome: SDI sends one per file, a second one is only recorded. */
export function sdiReceiptTransition(current: { status: SdiTransmissionStatus }, receipt: SdiReceipt): Transition | undefined {
  if (SDI_OUTCOMES.includes(current.status)) return undefined;
  const outcome = SDI_OUTCOME_BY_RECEIPT[receipt.type];
  const errors = receipt.errors.map((e) => `${e.code}${e.description ? ` ${e.description}` : ''}`).join('; ');
  const deliveredOn = sdiDeliveryDay(receipt);
  return {
    transmission: { status: outcome.transmission, sdiId: receipt.sdiId, ...(receipt.type === 'NS' ? { lastError: errors || 'Scartata dallo SDI' } : {}) },
    invoice: outcome.invoice,
    ...(deliveredOn ? { deliveredOn } : {}),
  };
}

/**
 * Day of delivery (RC, DataOraConsegna in Italian time) or of availability (MC, DataMessaADisposizione, AdE schema
 * only); undefined for a rejection or when the receipt does not give it.
 */
export function sdiDeliveryDay(receipt: SdiReceipt): string | undefined {
  if (receipt.type === 'MC') return receipt.availableOn;
  if (receipt.type !== 'RC' || !receipt.deliveredAt) return undefined;
  const at = parseSdiDateTime(receipt.deliveredAt);
  return at ? dayInItaly(at) : undefined;
}

/** Undefined when the receipt only needs recording (e.g. a warning, or anything after the SDI outcome). */
export function providerReceiptTransition(
  current: { status: SdiTransmissionStatus; sentAt: Date | null },
  receipt: { type: PecCertificationType; providerId?: string; error?: string },
  receivedAt: Date,
): Transition | undefined {
  if (SDI_OUTCOMES.includes(current.status)) return undefined;
  const reclaim = current.status === 'ERROR' ? ({ invoice: 'CLAIM' } as const) : {};
  if (receipt.type === 'accettazione' && (current.status === 'PENDING' || current.status === 'SENT' || current.status === 'ERROR')) {
    // Also closes a transmission left PENDING by a stop right after sending: the provider accepted it.
    return { transmission: { status: 'ACCEPTED_BY_PEC', sentAt: current.sentAt ?? receivedAt, pecProviderId: receipt.providerId, ...(current.status === 'ERROR' ? { lastError: null } : {}) }, ...reclaim };
  }
  if (receipt.type === 'avvenuta-consegna' && current.status !== 'DELIVERED_TO_SDI') {
    return { transmission: { status: 'DELIVERED_TO_SDI', sentAt: current.sentAt ?? receivedAt, ...(current.status === 'ERROR' ? { lastError: null } : {}) }, ...reclaim };
  }
  const failure = PROVIDER_FAILURE_MESSAGES[receipt.type];
  if (failure && current.status !== 'ERROR') {
    return { transmission: { status: 'ERROR', lastError: receipt.error ? `${failure} ${receipt.error}` : failure }, invoice: 'REOPEN' };
  }
  return undefined;
}
