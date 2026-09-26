import { XMLParser } from 'fast-xml-parser';

/**
 * "Dati di certificazione" attached as daticert.xml to every PEC receipt and transport envelope (Regole tecniche
 * del servizio di trasmissione di documenti informatici mediante posta elettronica certificata, allegato al DM
 * 2 novembre 2005, §7.3.3 and DTD in §7.4). Signed by the provider, so its sender is the certified one.
 */

export const PEC_CERTIFICATION_TYPES = [
  'accettazione', 'non-accettazione', 'presa-in-carico', 'avvenuta-consegna', 'posta-certificata', 'errore-consegna', 'preavviso-errore-consegna', 'rilevazione-virus',
] as const;
export type PecCertificationType = (typeof PEC_CERTIFICATION_TYPES)[number];

export interface PecCertificationData {
  /** Attribute "tipo" of postacert. */
  type: PecCertificationType;
  /** Attribute "errore": "nessuno" when there is no error. */
  error: string;
  /** "mittente": From of the original message. */
  sender?: string;
  recipients: string[];
  subject?: string;
  /** "identificativo": unique id the provider gave the original message (§6.3). */
  providerId?: string;
  /** "msgid": Message-ID of the original message before the provider replaced it (§6.3). */
  originalMessageId?: string;
  /** "data": day (gg/mm/aaaa), local time (hh:mm:ss) and offset from UTC ([+|-]hhmm), as written. */
  date?: { day: string; time: string; zone: string };
  /** "errore-esteso": provider's description of the error, if any. */
  extendedError?: string;
}

type Any = Record<string, unknown>;
const text = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'object') return text((v as Any)['#text']);
  const s = String(v).trim();
  return s === '' ? undefined : s;
};
const asArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** Message-IDs are compared without the angle brackets some headers keep around them. */
export const normalizeMessageId = (id: string | undefined): string | undefined => id?.trim().replace(/^<|>$/g, '') || undefined;

export function parsePecCertificationData(xml: string | Buffer): PecCertificationData {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseTagValue: false, trimValues: true });
  const root = (parser.parse(xml) as Any).postacert as Any | undefined;
  if (!root) throw new Error('Not PEC certification data: postacert root element not found');
  const type = root['@_tipo'] as PecCertificationType;
  if (!PEC_CERTIFICATION_TYPES.includes(type)) throw new Error(`Unknown PEC certification type: ${String(type)}`);
  const head = (root.intestazione ?? {}) as Any;
  const data = (root.dati ?? {}) as Any;
  const date = data.data as Any | undefined;
  return {
    type,
    error: text(root['@_errore']) ?? 'nessuno',
    sender: text(head.mittente),
    recipients: asArray(head.destinatari as unknown).map(text).filter((d): d is string => Boolean(d)),
    subject: text(head.oggetto),
    providerId: text(data.identificativo),
    originalMessageId: normalizeMessageId(text(data.msgid)),
    date: date ? { day: text(date.giorno) ?? '', time: text(date.ora) ?? '', zone: text(date['@_zona']) ?? '' } : undefined,
    extendedError: text(data['errore-esteso']),
  };
}
