import type { F24Section } from './f24-schedule.js';

/**
 * File of F24 forms for the taxpayer's own online payment, to be checked, prepared and sent with File Internet
 * (Desktop Telematico of the Agenzia delle Entrate), instead of copying each form into F24 web.
 *
 * Sources (docs/fonti/registro.json):
 * - ade-f24-spec-contribuenti-2015: "Specifiche tecniche per la trasmissione telematica dei Modelli F24 da parte dei
 *   contribuenti" (Allegato 1, 9 March 2015, the current version per ade-f24-specifiche-pagina). Records of "lunghezza
 *   fissa di 1.900 caratteri": one "A" (header), one "M" (taxpayer), one "V" per form "relativo al soggetto ed alla
 *   data di versamento indicati sul record M", one "Z" (trailer); every record ends with "A" and CR LF. Numeric fields
 *   (NU) are right-aligned with zeros, alphanumeric (AN) left-aligned with spaces, "Gli importi devono essere espressi
 *   in centesimi di euro". Record V "tipo A" is the form "con sezione IMU v.2013", the model printed by the app.
 * - The debit happens "alla data di versamento indicata nel campo 45 del record 'M'" when the file arrives before it:
 *   one file per payment date.
 * - ade-f24-formati-matricole-inps and the INPS reasons table (ade-causali-inps-2026-07-02): the "matricola INPS/codice
 *   INPS" is "Formato 3" (17 digits) for Artigiani and Commercianti and "Formato 6" (blank) for the Gestione Separata.
 *
 * The Treasury, INPS, regional and local sections are written (the regional and local ones carry the credits of the
 * return used in compensation, e.g. 3844 with the municipality code). The other entities section waits for the
 * professional funds (its "codice posizione" is mandatory in the specification, while the AdE tables of most funds
 * leave it blank: to be clarified); INAIL is not used by the app. In the local section the flags (ravvedimento,
 * immobili variati, acconto, saldo) are set "solo per tributi che lo richiedono": the app writes no such tax.
 *
 * Project choices, to be confirmed by the AdE control program ("Pagamenti con modello F24", mandatory for files not
 * made with the AdE software, per ade-telematici-versamenti-f24): names are written in capitals without accents (one
 * byte per character); the "rateazione" column is 0000 when the tax code table asks for no installment; the "progressivo
 * modulo" of every V record is 00000001, "congruente con il valore indicato sul record M" (which "Vale sempre
 * '00000001'"); optional fields (addresses, phone, e-mail) are left empty; names longer than their field are cut.
 */

export interface F24FileTaxpayer {
  fiscalCode: string;
  lastName: string;
  firstName: string;
  sex: 'M' | 'F';
  birthDate: Date;
  /** Municipality or foreign country of birth. */
  birthPlace: string;
  /** Province of birth, EE abroad. */
  birthProvince: string;
  /** Italian IBAN of the account to debit; without it File Internet asks for the bank details when preparing the file. */
  iban?: string;
}

export interface F24FileLine {
  section: F24Section;
  /** Treasury tax code or INPS reason. */
  code: string;
  /** INPS office code (4 digits). */
  officeCode?: string;
  /** Treasury, regional and local "rateazione": NNRR or 0101. */
  installmentCode?: string;
  /** Regional section: region code (2 digits); local section: municipality cadastral code (e.g. D567). */
  localCode?: string;
  /** INPS "matricola/codice INPS". */
  positionCode?: string;
  /** INPS period MM/YYYY. */
  periodFrom?: string;
  periodTo?: string;
  referenceYear: number;
  debitAmount: number;
  creditAmount: number;
}

export interface F24FileForm {
  lines: F24FileLine[];
}

const RECORD_LENGTH = 1900;
const TREASURY_ROWS = 6;
const INPS_ROWS = 4;
const REGIONAL_ROWS = 4;
const LOCAL_ROWS = 4;

/** Capitals, accents removed, only printable ASCII: every character takes one position. */
function ascii(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^\x20-\x7E]/g, ' ');
}

const cents = (amount: number) => Math.round(amount * 100);
const pad2 = (n: number) => String(n).padStart(2, '0');
/** GGMMAAAA, or with a separator GG-MM-AAAA. */
const dayMonthYear = (d: Date, sep = '') => [pad2(d.getUTCDate()), pad2(d.getUTCMonth() + 1), String(d.getUTCFullYear())].join(sep);
/** MM/YYYY → MMAAAA. */
const period = (value: string | undefined) => (value ? value.replace('/', '') : '');
/** 1234.56 → "1.234,56" (record M, field 44); over 15 characters "potranno essere omessi i separatori di migliaia". */
function italianAmount(amount: number): string {
  const [units, decimals] = amount.toFixed(2).split('.');
  const text = `${units.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimals}`;
  return text.length > 15 ? text.replace(/\./g, '') : text;
}

/** A fixed-length record: positions are 1-based, as in the specification. */
class RecordWriter {
  private readonly chars: string[] = Array<string>(RECORD_LENGTH - 2).fill(' ');

  constructor(type: string) {
    this.an(1, 1, type);
    // "Ultimi tre caratteri di controllo": "A" then CR LF.
    this.an(1898, 1, 'A');
  }

  an(position: number, length: number, value = ''): this {
    const text = ascii(value);
    if (text.length > length) throw new Error(`Valore troppo lungo per il campo in posizione ${position} (${length} caratteri): ${value}`);
    return this.write(position, text.padEnd(length, ' '));
  }

  nu(position: number, length: number, value: number | string = 0): this {
    const text = String(value);
    if (!/^\d*$/.test(text) || text.length > length) throw new Error(`Valore numerico non valido per il campo in posizione ${position} (${length} cifre): ${value}`);
    return this.write(position, text.padStart(length, '0'));
  }

  private write(position: number, text: string): this {
    for (let i = 0; i < text.length; i++) this.chars[position - 1 + i] = text[i];
    return this;
  }

  toString(): string {
    return this.chars.join('') + '\r\n';
  }
}

/** Totals of a section: debit, credit, sign ("P" when debit ≥ credit, "N" otherwise, blank when unused) and balance. */
function sectionTotals(r: RecordWriter, at: number, lines: F24FileLine[]): number {
  const debit = lines.reduce((s, l) => s + cents(l.debitAmount), 0);
  const credit = lines.reduce((s, l) => s + cents(l.creditAmount), 0);
  r.nu(at, 15, debit).nu(at + 15, 15, credit);
  r.an(at + 30, 1, lines.length === 0 ? '' : debit >= credit ? 'P' : 'N');
  r.nu(at + 31, 15, Math.abs(debit - credit));
  return debit - credit;
}

function headerRecord(t: F24FileTaxpayer): string {
  return new RecordWriter('A')
    .an(16, 5, 'F24A0')
    .an(21, 2, '04') // persona fisica
    .an(23, 16, t.fiscalCode)
    .an(39, 24, t.lastName.slice(0, 24))
    .an(63, 20, t.firstName.slice(0, 20))
    .an(83, 1, t.sex)
    .nu(84, 8, dayMonthYear(t.birthDate))
    .an(92, 40, t.birthPlace.slice(0, 40))
    .an(132, 2, t.birthProvince)
    .nu(211, 5) // CAP of the residence, optional
    .nu(353, 5) // CAP of a non-natural person
    .nu(435, 5)
    .nu(522, 3, 1) // progressivo dell'invio telematico: "Vale sempre 001"
    .nu(525, 3, 1) // numero totale degli invii: "Vale sempre 001"
    .toString();
}

function taxpayerRecord(t: F24FileTaxpayer, paymentDate: Date, total: number): string {
  return new RecordWriter('M')
    .an(2, 16, t.fiscalCode)
    .nu(18, 8, 1)
    .an(91, 1, 'E')
    .nu(92, 1) // esercizio a cavallo: only for non-natural persons
    .nu(93, 1) // no payer other than the taxpayer
    .nu(110, 1)
    .nu(156, 8)
    .nu(248, 5)
    .nu(330, 5)
    .an(438, 24, t.lastName.slice(0, 24))
    .an(462, 20, t.firstName.slice(0, 20))
    .nu(482, 8, dayMonthYear(t.birthDate))
    .an(490, 1, t.sex)
    .an(491, 25, t.birthPlace.slice(0, 25))
    .an(516, 2, t.birthProvince)
    // The IBAN goes only with an amount to debit.
    .an(1741, 27, total > 0 ? (t.iban ?? '').replace(/\s/g, '') : '')
    .an(1869, 4, 'EURO')
    .an(1873, 15, italianAmount(total / 100))
    .an(1888, 10, dayMonthYear(paymentDate, '-'))
    .toString();
}

function formRecord(t: F24FileTaxpayer, paymentDate: Date, form: F24FileForm, index: number): { record: string; balance: number } {
  const other = form.lines.find((l) => l.section === 'OTHER_ENTITY');
  if (other) throw new Error(`F24 n. ${index + 1}: il file per File Internet non contiene ancora la sezione "Altri enti previdenziali" (riga ${other.code})`);
  const section = (name: F24Section, label: string, max: number) => {
    const lines = form.lines.filter((l) => l.section === name);
    if (lines.length > max) throw new Error(`F24 n. ${index + 1}: ${lines.length} righe nella sezione ${label}, il modello ne ha ${max}`);
    return lines;
  };
  const treasury = section('TREASURY', 'Erario', TREASURY_ROWS);
  const inps = section('INPS', 'INPS', INPS_ROWS);
  const regional = section('REGIONAL', 'Regioni', REGIONAL_ROWS);
  const local = section('LOCAL', 'IMU e altri tributi locali', LOCAL_ROWS);

  const r = new RecordWriter('V').an(2, 16, t.fiscalCode).nu(18, 8, 1).an(90, 1, 'A');
  // Treasury: office and act code (not used by the app), then six rows of 58 characters from position 105.
  r.nu(94, 11);
  for (let i = 0; i < TREASURY_ROWS; i++) {
    const at = 105 + i * 58;
    const l = treasury[i];
    r.an(at, 4, l?.code).an(at + 4, 16).an(at + 20, 4, l ? (l.installmentCode ?? '0000') : '').nu(at + 24, 4, l?.referenceYear ?? 0);
    r.nu(at + 28, 15, l ? cents(l.debitAmount) : 0).nu(at + 43, 15, l ? cents(l.creditAmount) : 0);
  }
  let balance = sectionTotals(r, 453, treasury);
  // INPS: four rows of 67 characters from position 499.
  for (let i = 0; i < INPS_ROWS; i++) {
    const at = 499 + i * 67;
    const l = inps[i];
    if (l && !/^\d{4}$/.test(l.officeCode ?? '')) throw new Error(`F24 n. ${index + 1}: manca il codice sede INPS della riga ${l.code}`);
    r.nu(at, 4, l?.officeCode ?? 0).an(at + 4, 4, l?.code).an(at + 8, 17, l?.positionCode);
    r.nu(at + 25, 6, period(l?.periodFrom)).nu(at + 31, 6, period(l?.periodTo));
    r.nu(at + 37, 15, l ? cents(l.debitAmount) : 0).nu(at + 52, 15, l ? cents(l.creditAmount) : 0);
  }
  balance += sectionTotals(r, 767, inps);
  // Regions: four rows of 44 characters from position 813.
  for (let i = 0; i < REGIONAL_ROWS; i++) {
    const at = 813 + i * 44;
    const l = regional[i];
    if (l && !/^\d{2}$/.test(l.localCode ?? '')) throw new Error(`F24 n. ${index + 1}: manca il codice regione (2 cifre) della riga ${l.code}`);
    r.nu(at, 2, l?.localCode ?? 0).an(at + 2, 4, l?.code).an(at + 6, 4, l ? (l.installmentCode ?? '0000') : '').nu(at + 10, 4, l?.referenceYear ?? 0);
    r.nu(at + 14, 15, l ? cents(l.debitAmount) : 0).nu(at + 29, 15, l ? cents(l.creditAmount) : 0);
  }
  balance += sectionTotals(r, 989, regional);
  // IMU and other local taxes: four rows of 68 characters from position 1053 (operation id at 1035 left blank).
  for (let i = 0; i < LOCAL_ROWS; i++) {
    const at = 1053 + i * 68;
    const l = local[i];
    if (l && !/^[A-Z0-9]{4}$/.test(l.localCode ?? '')) throw new Error(`F24 n. ${index + 1}: manca il codice del comune della riga ${l.code}`);
    r.an(at, 4, l?.localCode).nu(at + 4, 1).nu(at + 5, 1).nu(at + 6, 1).nu(at + 7, 1).nu(at + 8, 3).nu(at + 11, 15);
    r.an(at + 26, 4, l?.code).an(at + 30, 4, l ? (l.installmentCode ?? '0000') : '').nu(at + 34, 4, l?.referenceYear ?? 0);
    r.nu(at + 38, 15, l ? cents(l.debitAmount) : 0).nu(at + 53, 15, l ? cents(l.creditAmount) : 0);
  }
  balance += sectionTotals(r, 1325, local);
  // Unused sections: numeric fields at zero (INAIL, other entities).
  for (let i = 0; i < 3; i++) {
    const at = 1371 + i * 52;
    r.nu(at, 5).nu(at + 5, 8).nu(at + 13, 2).nu(at + 15, 6).nu(at + 22, 15).nu(at + 37, 15);
  }
  sectionTotals(r, 1527, []);
  r.nu(1573, 4);
  for (let i = 0; i < 2; i++) {
    const at = 1577 + i * 60;
    r.nu(at + 9, 9).nu(at + 18, 6).nu(at + 24, 6).nu(at + 30, 15).nu(at + 45, 15);
  }
  sectionTotals(r, 1697, []);
  // "Saldo finale modello F24": "Deve essere sempre MAGGIORE o UGUALE A ZERO".
  if (balance < 0) throw new Error(`F24 n. ${index + 1}: il saldo finale è negativo`);
  r.nu(1793, 15, balance).nu(1808, 8, dayMonthYear(paymentDate));
  return { record: r.toString(), balance };
}

function trailerRecord(forms: number): string {
  return new RecordWriter('Z').nu(16, 9, forms).nu(25, 9, 1).toString();
}

/** The file of the F24 forms of one payment date (ade-f24-spec-contribuenti-2015). */
export function buildF24TelematicFile(taxpayer: F24FileTaxpayer, paymentDate: Date, forms: F24FileForm[]): string {
  if (forms.length === 0) throw new Error('Nessun F24 da inserire nel file');
  const records = forms.map((f, i) => formRecord(taxpayer, paymentDate, f, i));
  const total = records.reduce((s, r) => s + r.balance, 0);
  return headerRecord(taxpayer) + taxpayerRecord(taxpayer, paymentDate, total) + records.map((r) => r.record).join('') + trailerRecord(forms.length);
}
