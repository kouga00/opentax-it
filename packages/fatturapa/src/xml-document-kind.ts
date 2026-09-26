/**
 * What an XML file received or downloaded around SDI is, from its root element: an invoice (FatturaElettronica,
 * Spec. FatturaPA 1.9.1), an SDI receipt handled by this app (RicevutaConsegna, NotificaScarto,
 * NotificaMancataConsegna, schema MessaggiTypes_v1.1), another SDI message, or SDI metadata (FileMetadati of the AdE
 * portal, MetadatiInvioFile of fatturapa.gov.it). Only the start of the file is looked at, with or without prefix.
 */
export type XmlDocumentKind = 'INVOICE' | 'SDI_RECEIPT' | 'SDI_MESSAGE' | 'SDI_METADATA';

const root = (names: string) => new RegExp(`<(?:[\\w.-]+:)?(?:${names})[\\s>/]`);

const KINDS: Array<[XmlDocumentKind, RegExp]> = [
  ['INVOICE', root('FatturaElettronica')],
  ['SDI_RECEIPT', root('RicevutaConsegna|NotificaScarto|NotificaMancataConsegna')],
  ['SDI_METADATA', root('FileMetadati|MetadatiInvioFile')],
  ['SDI_MESSAGE', root('NotificaEsito|NotificaDecorrenzaTermini|AttestazioneTrasmissioneFattura|NotificaEsitoCommittente|ScartoEsitoCommittente')],
];

export function xmlDocumentKind(xml: string): XmlDocumentKind | undefined {
  // Skips the XML declaration and processing instructions (e.g. the stylesheet of the official receipts).
  const head = xml.slice(0, 4000).replace(/<\?[\s\S]*?\?>/g, '');
  const first = /<(?:[\w.-]+:)?[\w.-]+[\s>/]/.exec(head)?.[0];
  if (!first) return undefined;
  return KINDS.find(([, re]) => re.test(first))?.[0];
}
