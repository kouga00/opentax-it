import { XMLParser } from 'fast-xml-parser';

/**
 * SDI receipts sent back to the transmitter (Allegato A, Specifiche tecniche FatturaPA 1.9.1, §1.4 and §1.5.7;
 * schema MessaggiTypes_v1.1.xsd): signed XML files attached to the PEC message.
 *
 * Only the receipts for a flat-rate supplier sending to businesses and consumers are read: delivery (RC),
 * rejection (NS) and failed delivery (MC). NotificaEsito and the other messages concern invoices to the public
 * administration, which this app does not send yet.
 */

export type SdiReceiptType = 'RC' | 'NS' | 'MC';

export interface SdiReceiptError {
  code: string;
  description?: string;
}

export interface SdiReceipt {
  type: SdiReceiptType;
  /** IdentificativoSdI assigned by SDI to the file it received. */
  sdiId: string;
  /** NomeFile: name of the invoice file this receipt refers to. */
  fileName: string;
  /** DataOraRicezione (T0, §1.7): when SDI received the file. */
  receivedAt: string;
  /** DataOraConsegna (T1, RC only): when the file was delivered to the recipient. */
  deliveredAt?: string;
  /** ListaErrori (NS only). */
  errors: SdiReceiptError[];
  /** Descrizione (MC only). */
  description?: string;
  messageId: string;
  note?: string;
}

const ROOTS: Record<string, SdiReceiptType> = { RicevutaConsegna: 'RC', NotificaScarto: 'NS', NotificaMancataConsegna: 'MC' };

type Any = Record<string, unknown>;
const text = (v: unknown): string | undefined => (v === undefined || v === null || v === '' ? undefined : String(v));
const asArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/**
 * File name of a receipt: "<invoice file name without extension>_<RC|NS|MC|MT>_<progressive>.xml", with a progressive
 * of up to 3 characters [a-zA-Z0-9] ("Nomenclatura dei file per la trasmissione di ricevute/notifiche").
 */
const RECEIPT_FILE_NAME = /^(.+)_(RC|NS|MC|MT)_([A-Za-z0-9]{1,3})\.xml$/;

export function parseSdiReceiptFileName(name: string): { invoiceFileBase: string; type: string; progressive: string } | undefined {
  const m = RECEIPT_FILE_NAME.exec(name);
  return m ? { invoiceFileBase: m[1], type: m[2], progressive: m[3] } : undefined;
}

/** Reads a receipt; returns undefined for SDI messages that are not RC, NS or MC. The XAdES signature is not verified. */
export function parseSdiReceipt(xml: string | Buffer): SdiReceipt | undefined {
  const parser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, parseTagValue: false, trimValues: true });
  const doc = parser.parse(xml) as Any;
  const rootName = Object.keys(ROOTS).find((k) => doc[k] !== undefined);
  if (!rootName) return undefined;
  const root = doc[rootName] as Any;
  const sdiId = text(root.IdentificativoSdI);
  const fileName = text(root.NomeFile);
  const receivedAt = text(root.DataOraRicezione);
  const messageId = text(root.MessageId);
  if (!sdiId || !fileName || !receivedAt || !messageId) throw new Error(`Incomplete SDI receipt ${rootName}: IdentificativoSdI, NomeFile, DataOraRicezione and MessageId are required`);
  const errors = asArray((root.ListaErrori as Any | undefined)?.Errore as Any | Any[] | undefined).map((e) => ({ code: text(e.Codice) ?? '', description: text(e.Descrizione) }));
  return {
    type: ROOTS[rootName],
    sdiId,
    fileName,
    receivedAt,
    deliveredAt: text(root.DataOraConsegna),
    errors,
    description: text(root.Descrizione),
    messageId,
    note: text(root.Note),
  };
}
