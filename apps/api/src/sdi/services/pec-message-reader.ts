import { normalizeMessageId, parsePecCertificationData, parseSdiReceipt, parseSdiReceiptFileName, type PecCertificationData, type PecCertificationType, PEC_CERTIFICATION_TYPES } from '@opentax-it/fatturapa';
import PostalMime, { type Attachment, type Email } from 'postal-mime';
import type { PecInbound } from '../types/pec-inbound.js';
import type { SdiReceiptMessage } from '../types/sdi-receipt-message.js';

/**
 * Recognizes the PEC messages that matter for SDI transmissions (Regole tecniche PEC, allegato al DM 2 novembre
 * 2005, §6.3 and §7.3; Spec. FatturaPA 1.9.1 §1.4 and §1.5.7). Everything else in the mailbox is "other" and is
 * neither stored nor looked into further.
 *
 * - Receipts of our own provider carry "X-Ricevuta" and refer to our message through "X-Riferimento-Message-ID".
 * - Messages from SDI arrive in a transport envelope ("X-Trasporto: posta-certificata") with the original message
 *   attached as postacert.eml; the SDI receipt is an XML file attached to that original message.
 * - SDI is recognized from the sender certified by the provider in daticert.xml, not from the From header.
 * - A certified SDI message without receipts (e.g. the "messaggio di cortesia", §1.3.1) is returned as it is.
 */

/**
 * Mailboxes of SDI: "le caselle di funzionamento del Sistema di Interscambio (sdixx@pec.fatturapa.it)" (Spec. 1.9.1
 * §2.1.1, PECDestinatario), among them sdi01@pec.fatturapa.it and the address assigned after the first reply (§1.3.1).
 */
const SDI_MAILBOX = /^sdi[a-z0-9]*@pec\.fatturapa\.it$/i;

/** Characters of an SDI message without receipts kept for the user. */
const TEXT_EXCERPT = 1000;

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

/** Subject of a provider receipt is "<TYPE>: <original subject>" (§6.3.3, §6.5.2; "SUP. TEMPO MASSIMO" in §6.3.5). */
const originalSubject = (subject: string | undefined) => subject?.replace(/^[A-Z .-]+:\s*/, '').trim() || undefined;

export async function readPecMessage(raw: Buffer): Promise<PecInbound> {
  const email = await PostalMime.parse(raw, OPTIONS);

  const receiptType = header(email, 'x-ricevuta') as PecCertificationType | undefined;
  if (receiptType && PEC_CERTIFICATION_TYPES.includes(receiptType)) {
    // Receipts carry the certification data of the provider (§6.3.3, §7.4): without it, or with another type, the
    // header alone is not trusted.
    const cert = certification(email);
    if (!cert || cert.type !== receiptType) return { kind: 'other' };
    return {
      kind: 'provider-receipt',
      type: receiptType,
      originalMessageId: normalizeMessageId(header(email, 'x-riferimento-message-id')) ?? cert.originalMessageId,
      originalSubject: cert.subject ?? originalSubject(email.subject),
      providerId: cert.providerId,
      date: email.date,
      error: cert.error !== 'nessuno' ? (cert.extendedError ?? cert.error) : undefined,
    };
  }

  if (header(email, 'x-trasporto') !== 'posta-certificata') return { kind: 'other' };
  const sender = certification(email)?.sender?.toLowerCase();
  const original = named(email, 'postacert.eml');
  if (!sender || !SDI_MAILBOX.test(sender) || !original) return { kind: 'other' };

  const inner = await PostalMime.parse(bytes(original), OPTIONS);
  const receipts: SdiReceiptMessage['receipts'] = [];
  for (const a of inner.attachments) {
    if (!a.filename || !parseSdiReceiptFileName(a.filename)) continue;
    const xml = bytes(a);
    const receipt = parseSdiReceipt(xml);
    if (receipt) receipts.push({ fileName: a.filename, xml, receipt });
  }
  if (receipts.length) return { kind: 'sdi-receipt', sdiAddress: sender, receipts };
  // A certified SDI message without receipts, e.g. the "messaggio di cortesia" for a PEC without attachment.
  return { kind: 'sdi-message', sdiAddress: sender, subject: inner.subject, date: inner.date ?? email.date, text: inner.text?.trim().slice(0, TEXT_EXCERPT) };
}
