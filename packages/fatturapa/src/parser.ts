import { XMLParser } from 'fast-xml-parser';

/**
 * Reads a FatturaPA XML file (schema v1.2.x) into a plain object. Used to import
 * invoices issued with other software. Only the elements relevant to a flat-rate
 * invoice are mapped; anything else is ignored. Signed files (.p7m) are not supported.
 * Element names follow AdE "Allegato A – Specifiche tecniche vers. 1.9.1".
 */

export interface ParsedParty {
  countryCode?: string;
  vatNumber?: string;
  fiscalCode?: string;
  businessName?: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  province?: string;
  country?: string;
  taxRegime?: string;
}

export interface ParsedLine {
  lineNumber: number;
  description: string;
  quantity?: number;
  unit?: string;
  unitPrice: number;
  totalPrice: number;
  vatRatePct: number;
  nature?: string;
}

export interface ParsedInvoice {
  format: string;
  transmissionId?: string;
  recipientCode?: string;
  recipientPec?: string;
  supplier: ParsedParty;
  customer: ParsedParty;
  documentType: string;
  number: string;
  date: string;
  currency: string;
  documentTotal?: number;
  notes: string[];
  stampDuty?: { virtual: boolean; amount?: number };
  /** DatiCassaPrevidenziale blocks (0..N): TC22 is the INPS surcharge, the other TipoCassa codes are professional funds. */
  socialSecurityFunds: Array<{ type: string; ratePct: number; amount: number; taxable: number; nature?: string }>;
  lines: ParsedLine[];
  summaryNatures: string[];
  relatedDocuments: Array<{ number: string; date?: string }>;
  payments: Array<{ method?: string; dueDate?: string; amount?: number; iban?: string }>;
}

type Any = Record<string, unknown>;

const asArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const str = (v: unknown): string | undefined => (v === undefined || v === null ? undefined : String(v));
const num = (v: unknown): number | undefined => (v === undefined || v === null || v === '' ? undefined : Number(v));

function party(node: Any | undefined): ParsedParty {
  if (!node) return {};
  const d = (node.DatiAnagrafici ?? {}) as Any;
  const a = (d.Anagrafica ?? {}) as Any;
  const id = (d.IdFiscaleIVA ?? {}) as Any;
  const s = (node.Sede ?? {}) as Any;
  return {
    countryCode: str(id.IdPaese),
    vatNumber: str(id.IdCodice),
    fiscalCode: str(d.CodiceFiscale),
    businessName: str(a.Denominazione),
    firstName: str(a.Nome),
    lastName: str(a.Cognome),
    address: str(s.Indirizzo),
    postalCode: str(s.CAP),
    city: str(s.Comune),
    province: str(s.Provincia),
    country: str(s.Nazione),
    taxRegime: str(d.RegimeFiscale),
  };
}

export function parseInvoiceXml(xml: string): ParsedInvoice {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', removeNSPrefix: true, parseTagValue: false, trimValues: true });
  const doc = parser.parse(xml) as Any;
  const root = doc.FatturaElettronica as Any | undefined;
  if (!root) throw new Error('Not a FatturaPA file: FatturaElettronica root element not found');
  const header = (root.FatturaElettronicaHeader ?? {}) as Any;
  const bodies = asArray(root.FatturaElettronicaBody as Any | Any[]);
  if (bodies.length !== 1) throw new Error(`Expected one FatturaElettronicaBody, found ${bodies.length} (invoice lots are not supported)`);
  const body = bodies[0];
  const tx = (header.DatiTrasmissione ?? {}) as Any;
  const general = ((body.DatiGenerali ?? {}) as Any);
  const gd = (general.DatiGeneraliDocumento ?? {}) as Any;
  const goods = (body.DatiBeniServizi ?? {}) as Any;
  const bollo = gd.DatiBollo as Any | undefined;

  const lines: ParsedLine[] = asArray(goods.DettaglioLinee as Any | Any[]).map((l, i) => ({
    lineNumber: num(l.NumeroLinea) ?? i + 1,
    description: str(l.Descrizione) ?? '',
    quantity: num(l.Quantita),
    unit: str(l.UnitaMisura),
    unitPrice: num(l.PrezzoUnitario) ?? 0,
    totalPrice: num(l.PrezzoTotale) ?? 0,
    vatRatePct: num(l.AliquotaIVA) ?? 0,
    nature: str(l.Natura),
  }));

  return {
    format: str(root['@_versione']) ?? str(tx.FormatoTrasmissione) ?? '',
    transmissionId: str(tx.ProgressivoInvio),
    recipientCode: str(tx.CodiceDestinatario),
    recipientPec: str(tx.PECDestinatario),
    supplier: party(header.CedentePrestatore as Any),
    customer: party(header.CessionarioCommittente as Any),
    documentType: str(gd.TipoDocumento) ?? '',
    number: str(gd.Numero) ?? '',
    date: str(gd.Data) ?? '',
    currency: str(gd.Divisa) ?? 'EUR',
    documentTotal: num(gd.ImportoTotaleDocumento),
    notes: asArray(gd.Causale as string | string[]).map(String),
    stampDuty: bollo ? { virtual: str(bollo.BolloVirtuale) === 'SI', amount: num(bollo.ImportoBollo) } : undefined,
    socialSecurityFunds: asArray(gd.DatiCassaPrevidenziale as Any | Any[]).map((cassa) => ({
      type: str(cassa.TipoCassa) ?? '',
      ratePct: num(cassa.AlCassa) ?? 0,
      amount: num(cassa.ImportoContributoCassa) ?? 0,
      taxable: num(cassa.ImponibileCassa) ?? 0,
      nature: str(cassa.Natura),
    })),
    lines,
    summaryNatures: asArray(goods.DatiRiepilogo as Any | Any[]).map((r) => str(r.Natura)).filter((n): n is string => Boolean(n)),
    relatedDocuments: asArray(general.DatiFattureCollegate as Any | Any[]).map((r) => ({ number: str(r.IdDocumento) ?? '', date: str(r.Data) })),
    payments: asArray((body.DatiPagamento as Any | undefined)?.DettaglioPagamento as Any | Any[]).map((p) => ({
      method: str(p.ModalitaPagamento),
      dueDate: str(p.DataScadenzaPagamento),
      amount: num(p.ImportoPagamento),
      iban: str(p.IBAN),
    })),
  };
}
