import { XMLBuilder } from 'fast-xml-parser';
import type { FlatRateInvoice, Party } from './types.js';

/**
 * Builds the FatturaPA XML (schema v1.2.3, technical specifications v1.9.1) for an
 * invoice issued under the flat-rate regime (no VAT charged, Natura N2.1/N2.2).
 *
 * Element order follows the XSD sequence exactly; fast-xml-parser preserves the
 * insertion order of object keys, so every object below is written in schema order.
 *
 * References: AdE "Allegato A – Specifiche tecniche vers. 1.9.1"; AdE guide
 * "La fattura elettronica e i servizi gratuiti", December 2025 (flat-rate section).
 */

const NS = 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2';

/** Amounts with exactly 2 decimals (ImportoType / Amount2DecimalType). */
export function amount2(n: number): string {
  return n.toFixed(2);
}

/** Quantities and unit prices: 2 to 8 decimals (QuantitaType / PrezzoUnitarioType). */
export function amount8(n: number): string {
  const s = n.toFixed(8).replace(/0+$/, '');
  const [int, dec = ''] = s.split('.');
  return `${int}.${dec.padEnd(2, '0')}`;
}

/**
 * XSD text facets only allow Basic Latin + Latin-1 Supplement (e.g. Descrizione, Causale:
 * pattern [\p{IsBasicLatin}\p{IsLatin-1Supplement}]). Typographic punctuation is mapped
 * to ASCII equivalents; any other character outside the allowed ranges is dropped.
 */
export function sanitizeText(input: string): string {
  const replacements: Record<string, string> = {
    '\u2013': '-', '\u2014': '-', '\u2018': "'", '\u2019': "'", '\u201A': "'",
    '\u201C': '"', '\u201D': '"', '\u201E': '"', '\u2026': '...', '\u00A0': ' ', '\u20AC': 'EUR',
  };
  const normalized = input.replace(/\r\n|\r|\n/g, ' ');
  let out = '';
  for (const ch of normalized) {
    if (replacements[ch] !== undefined) {
      out += replacements[ch];
    } else if (ch === '\t') {
      out += ' ';
    } else {
      const code = ch.codePointAt(0)!;
      // Accept printable Basic Latin (0x20–0x7E) and printable Latin-1 Supplement (0xA1–0xFF).
      // Discard DEL (0x7F), C1 controls (0x80–0x9F), and any character > 0xFF not in replacements.
      if ((code >= 0x20 && code <= 0x7E) || (code >= 0xA1 && code <= 0xFF)) {
        out += ch;
      }
    }
  }
  return out;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function personalData(party: Party) {
  const anagrafica = party.businessName
    ? { Denominazione: sanitizeText(party.businessName) }
    : { Nome: sanitizeText(party.firstName ?? ''), Cognome: sanitizeText(party.lastName ?? '') };
  return omitUndefined({
    IdFiscaleIVA: party.vatNumber ? { IdPaese: party.countryCode, IdCodice: party.vatNumber } : undefined,
    CodiceFiscale: party.fiscalCode,
    Anagrafica: anagrafica,
  });
}

function registeredOffice(party: Party) {
  const a = party.address;
  return omitUndefined({
    Indirizzo: sanitizeText(a.street),
    NumeroCivico: a.number,
    CAP: a.postalCode,
    Comune: sanitizeText(a.city),
    Provincia: a.province,
    Nazione: a.country,
  });
}

/** Totals derived from the input, so that XML and stored invoice never diverge. */
export function computeTotals(inv: FlatRateInvoice) {
  const linesTotal = round2(inv.lines.reduce((s, l) => s + l.totalPrice, 0));
  const fund = inv.socialSecurityFund?.amount ?? 0;
  const stamp = inv.stampDuty?.amount ?? 0;
  /** ImponibileImporto in DatiRiepilogo includes the fund contribution (spec: "somma degli importi ... e dei contributi cassa"). */
  const taxable = round2(linesTotal + fund);
  /** AdE guide: the EUR 2 stamp duty is included in ImportoTotaleDocumento. */
  const documentTotal = round2(taxable + stamp);
  return { linesTotal, fund, stamp, taxable, documentTotal };
}

export function validateInvoice(inv: FlatRateInvoice): string[] {
  const errors: string[] = [];
  if (!/^[A-Za-z0-9]{1,10}$/.test(inv.transmissionId)) errors.push('transmissionId must be 1-10 alphanumeric characters');
  // Spec 1.9.1, error 00427: 6 characters (IPA office code) with FPA12, 7 with FPR12.
  if (inv.format === 'FPA12' ? !/^[A-Z0-9]{6}$/.test(inv.recipientCode) : !/^[A-Z0-9]{7}$/.test(inv.recipientCode)) {
    errors.push(`recipientCode must be ${inv.format === 'FPA12' ? 6 : 7} characters with ${inv.format} (error 00427)`);
  }
  if (inv.recipientCode === 'XXXXXXX' && inv.customer.countryCode === 'IT') errors.push('recipientCode XXXXXXX requires a non-IT customer (error 00313)');
  if (inv.number.length > 20) errors.push('number exceeds 20 characters');
  if (sanitizeText(inv.legalReference).length > 100) errors.push('legalReference exceeds 100 characters');
  for (const n of inv.notes) if (sanitizeText(n).length > 200) errors.push('each note (Causale) must be at most 200 characters');
  if (inv.lines.length === 0) errors.push('at least one line is required');
  for (const l of inv.lines) if (sanitizeText(l.description).length > 1000) errors.push('line description exceeds 1000 characters');
  if (!inv.supplier.vatNumber) errors.push('supplier VAT number is required');
  if (!inv.customer.businessName && !(inv.customer.firstName && inv.customer.lastName)) errors.push('customer needs a business name or first and last name');
  if (inv.customer.countryCode === 'IT' && !inv.customer.vatNumber && !inv.customer.fiscalCode) errors.push('Italian customer needs a VAT number or fiscal code');
  // AdE FAQ "Fatture verso e da soggetti stranieri": foreign customers (businesses and consumers) are identified
  // with IdFiscaleIVA/IdCodice (alphanumeric, max 28, not validated by SDI), leaving CodiceFiscale empty.
  if (inv.customer.countryCode !== 'IT' && !inv.customer.vatNumber) errors.push('Foreign customer needs an identifier in vatNumber (IdCodice)');
  if (inv.customer.countryCode !== 'IT' && inv.customer.vatNumber && inv.customer.vatNumber.length > 28) errors.push('IdCodice exceeds 28 characters');
  for (const m of inv.lineManagementData ?? []) if (m.type.length > 10) errors.push('lineManagementData.type exceeds 10 characters');
  if ((inv.documentType === 'TD04' || inv.documentType === 'TD05') && !inv.relatedDocuments?.length) errors.push('credit/debit notes must reference the corrected invoice');
  return errors;
}

export function buildInvoiceXml(inv: FlatRateInvoice): string {
  const errors = validateInvoice(inv);
  if (errors.length) throw new Error(`Invalid invoice: ${errors.join('; ')}`);

  const totals = computeTotals(inv);
  const transmitterId = inv.supplier.fiscalCode ?? inv.supplier.vatNumber!;

  const header = {
    DatiTrasmissione: omitUndefined({
      IdTrasmittente: { IdPaese: inv.supplier.countryCode, IdCodice: transmitterId },
      ProgressivoInvio: inv.transmissionId,
      FormatoTrasmissione: inv.format,
      CodiceDestinatario: inv.recipientCode,
      PECDestinatario: inv.recipientPec,
    }),
    CedentePrestatore: {
      DatiAnagrafici: { ...personalData(inv.supplier), RegimeFiscale: inv.supplier.taxRegime },
      Sede: registeredOffice(inv.supplier),
    },
    CessionarioCommittente: {
      DatiAnagrafici: personalData(inv.customer),
      Sede: registeredOffice(inv.customer),
    },
  };

  const generalDocument = omitUndefined({
    TipoDocumento: inv.documentType,
    Divisa: inv.currency,
    Data: inv.date,
    Numero: inv.number,
    DatiBollo: inv.stampDuty
      ? omitUndefined({ BolloVirtuale: 'SI', ImportoBollo: inv.stampDuty.amount !== undefined ? amount2(inv.stampDuty.amount) : undefined })
      : undefined,
    DatiCassaPrevidenziale: inv.socialSecurityFund
      ? {
          TipoCassa: inv.socialSecurityFund.type,
          AlCassa: amount2(inv.socialSecurityFund.ratePct),
          ImportoContributoCassa: amount2(inv.socialSecurityFund.amount),
          ImponibileCassa: amount2(inv.socialSecurityFund.taxable),
          AliquotaIVA: amount2(0),
          Natura: inv.vatNature,
        }
      : undefined,
    ImportoTotaleDocumento: amount2(totals.documentTotal),
    Causale: inv.notes.length ? inv.notes.map(sanitizeText) : undefined,
  });

  const body = {
    DatiGenerali: omitUndefined({
      DatiGeneraliDocumento: generalDocument,
      DatiFattureCollegate: inv.relatedDocuments?.map((r) => omitUndefined({ IdDocumento: r.number, Data: r.date })),
    }),
    DatiBeniServizi: {
      DettaglioLinee: inv.lines.map((l, i) =>
        omitUndefined({
          NumeroLinea: i + 1,
          Descrizione: sanitizeText(l.description),
          Quantita: l.quantity !== undefined ? amount8(l.quantity) : undefined,
          UnitaMisura: l.unit,
          PrezzoUnitario: amount8(l.unitPrice),
          PrezzoTotale: amount2(l.totalPrice),
          AliquotaIVA: amount2(0),
          Natura: inv.vatNature,
          AltriDatiGestionali: inv.lineManagementData?.length
            ? inv.lineManagementData.map((m) => omitUndefined({ TipoDato: m.type, RiferimentoTesto: m.text ? sanitizeText(m.text) : undefined }))
            : undefined,
        }),
      ),
      DatiRiepilogo: {
        AliquotaIVA: amount2(0),
        Natura: inv.vatNature,
        ImponibileImporto: amount2(totals.taxable),
        Imposta: amount2(0),
        RiferimentoNormativo: sanitizeText(inv.legalReference),
      },
    },
    DatiPagamento: inv.payment
      ? {
          CondizioniPagamento: inv.payment.terms,
          DettaglioPagamento: inv.payment.installments.map((i) =>
            omitUndefined({
              ModalitaPagamento: inv.payment!.method,
              DataScadenzaPagamento: i.dueDate,
              ImportoPagamento: amount2(i.amount),
              IBAN: inv.payment!.iban,
              BIC: inv.payment!.bic,
            }),
          ),
        }
      : undefined,
  };

  const doc = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    'p:FatturaElettronica': {
      '@_versione': inv.format,
      '@_xmlns:p': NS,
      '@_xmlns:ds': 'http://www.w3.org/2000/09/xmldsig#',
      '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      '@_xsi:schemaLocation': `${NS} http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2.3/Schema_del_file_xml_FatturaPA_v1.2.3.xsd`,
      FatturaElettronicaHeader: header,
      FatturaElettronicaBody: body,
    },
  };

  const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_', format: true, indentBy: '  ', suppressEmptyNode: true });
  return builder.build(doc) as string;
}

/**
 * File name required by SDI: <IdPaese><IdCodice>_<progressivo>.xml where the progressive
 * is up to 5 alphanumeric characters (spec 1.9.1 §1.2.2). We use a zero-padded number.
 */
export function invoiceFileName(countryCode: string, transmitterId: string, sequence: number): string {
  const progressive = sequence.toString(36).toUpperCase().padStart(5, '0');
  if (progressive.length > 5) throw new Error('file sequence exceeds 5 characters');
  return `${countryCode}${transmitterId}_${progressive}.xml`;
}

/**
 * Next file sequence for a transmitter (spec 1.9.1 §1.2.2): the progressive only has to differ from the
 * names already sent by the same subject ("non deve necessariamente seguire una stretta progressività";
 * a duplicate is rejected with error 00002). Every existing name with the same prefix is read as a
 * base-36 number, whatever software produced it, and the result is above all of them and at least
 * `start` (e.g. to skip names sent from the AdE portal and not imported here).
 */
export function nextFileSequence(existingNames: Iterable<string>, countryCode: string, transmitterId: string, start?: string): number {
  const prefix = `${countryCode}${transmitterId}_`.toUpperCase();
  let max = start ? parseInt(start, 36) - 1 : 0;
  for (const name of existingNames) {
    const upper = name.toUpperCase();
    if (!upper.startsWith(prefix)) continue;
    const m = upper.slice(prefix.length).match(/^([A-Z0-9]{1,5})\.XML(\.P7M)?$/);
    if (m) max = Math.max(max, parseInt(m[1], 36));
  }
  return max + 1;
}
