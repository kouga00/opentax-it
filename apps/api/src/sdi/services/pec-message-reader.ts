import { normalizeMessageId, parsePecCertificationData, parseSdiReceipt, parseSdiReceiptFileName, type PecCertificationData, type PecCertificationType, PEC_CERTIFICATION_TYPES } from '@opentax-it/fatturapa';
import PostalMime, { type Attachment, type Email } from 'postal-mime';
import type { PecInbound } from '../types/pec-inbound.js';

/**
 * Recognizes the PEC messages that matter for SDI transmissions (Regole tecniche PEC, allegato al DM 2 novembre
 * 2005, §6.3 and §7.3; Spec. FatturaPA 1.9.1 §1.4 and §1.5.7). Everything else in the mailbox is "other" and is
 * neither stored nor looked into further.
 *
 * - Receipts of our own provider carry "X-Ricevuta" and refer to our message through "X-Riferimento-Message-ID".
 * - Messages from SDI arrive in a transport envelope ("X-Trasporto: posta-certificata") with the original message
 *   attached as postacert.eml; the SDI receipt is an XML file attached to that original message.
 * - SDI is recognized from the sender certified by the provider in daticert.xml, not from the From header.
 */

/** SDI sends from addresses of this domain: sdi01@pec.fatturapa.it and those it assigns (Allegato B 1.8.4 §3.1.1). */
const SDI_DOMAIN = '@pec.fatturapa.it';

/** Nested messages are parsed one level at a time, and at most two levels (envelope, then original). */
const OPTIONS = { forceRfc822Attachments: true, attachmentEncoding: 'arraybuffer', maxRfc822NestingDepth: 0 } as const;

const header = (email: Email, name: string) => email.headers.find((h) => h.key === name)?.value.trim();
const bytes = (a: Attachment) => Buffer.from(a.content as ArrayBuffer);
const named = (email: Email, name: string) => email.attachments.find((a) => a.filename?.toLowerCase() === name);

function certification(email: Email): PecCertificationData | undefined {
  const file = named(email, 'daticert.xml');
  if (!file) return undefined;
  try {
    return parsePecCertificationData(bytes(file));
  } catch {
    return undefined;
  }
}

/** Subject of a provider receipt is "<TYPE>: <original subject>" (§6.3.3, §6.5.2). */
const originalSubject = (subject: string | undefined) => subject?.replace(/^[A-Z -]+:\s*/, '').trim() || undefined;

export async function readPecMessage(raw: Buffer): Promise<PecInbound> {
  const email = await PostalMime.parse(raw, OPTIONS);

  const receiptType = header(email, 'x-ricevuta') as PecCertificationType | undefined;
  if (receiptType && PEC_CERTIFICATION_TYPES.includes(receiptType)) {
    const cert = certification(email);
    return {
      kind: 'provider-receipt',
      type: receiptType,
      originalMessageId: normalizeMessageId(header(email, 'x-riferimento-message-id')) ?? cert?.originalMessageId,
      originalSubject: originalSubject(email.subject) ?? cert?.subject,
      providerId: cert?.providerId,
      date: email.date,
      error: cert && cert.error !== 'nessuno' ? (cert.extendedError ?? cert.error) : undefined,
    };
  }

  if (header(email, 'x-trasporto') !== 'posta-certificata') return { kind: 'other' };
  const sender = certification(email)?.sender?.toLowerCase();
  const original = named(email, 'postacert.eml');
  if (!sender?.endsWith(SDI_DOMAIN) || !original) return { kind: 'other' };

  const inner = await PostalMime.parse(bytes(original), OPTIONS);
  const receipts = [];
  for (const a of inner.attachments) {
    if (!a.filename || !parseSdiReceiptFileName(a.filename)) continue;
    const xml = bytes(a);
    const receipt = parseSdiReceipt(xml);
    if (receipt) receipts.push({ fileName: a.filename, xml, receipt });
  }
  return receipts.length ? { kind: 'sdi-receipt', sdiAddress: sender, receipts } : { kind: 'other' };
}
