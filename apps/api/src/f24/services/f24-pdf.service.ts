import { Injectable, Logger, ServiceUnavailableException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { StorageService } from '../../storage/storage.service.js';

/**
 * Prints an F24 by writing the values onto the official form: the AdE "Modello di
 * versamento unificato - F24 Ordinario" (MOD. F24 – 2013 EURO, three copies), published at
 * https://www.agenziaentrate.gov.it/portale/schede/pagamenti/f24/modello-e-istruzioni-f24.
 * The PDF is not redistributed with the source code: it is downloaded from the AdE site on
 * first use (F24_MODEL_URL) and cached in the storage directory. Its SHA-256 must match the
 * one this layout was calibrated on (F24_MODEL_SHA256): a new edition, or a file altered on
 * the way, is refused unless F24_MODEL_ALLOW_UNVERIFIED=true (then only logged).
 *
 * Field positions (PDF points, origin bottom-left) were measured on that file with
 * `pdftotext -bbox` (the printed commas of the amount columns give the row grid: rows
 * are 12 pt apart, six rows in the Treasury section, four in the INPS section).
 * Amounts are written with the integer part right-aligned before the printed comma and
 * two decimals after it, as required by the form ("Gli importi devono sempre essere
 * indicati con le prime due cifre decimali", AdE "Avvertenze per la compilazione").
 *
 * Personal data not held in the profile (date and place of birth, sex) are left blank.
 */

export const F24_MODEL_URL =
  process.env.F24_MODEL_URL ??
  'https://www.agenziaentrate.gov.it/portale/documents/20143/250689/Modello+di+versamento+unificato+-+F24+Ordinario_i+Modello+F24+%282%29.pdf/b773b043-a490-82de-550a-eda75246efa0?t=1372409604419';
/** SHA-256 of the model this layout was calibrated on (downloaded 2026-09-22). */
export const F24_MODEL_SHA256 = 'a5429ca42c7330fdd514a4143734342b1e29dbe66edb27185e3be36a6d51712a';
const MODEL_PATH = 'models/f24-ordinario.pdf';

const PAGE_HEIGHT = 841.89;
/** y from the top of the page → PDF y. */
const y = (top: number) => PAGE_HEIGHT - top;

/** Boxes as [left, right] in PDF points; text is centered in them. */
const LAYOUT = {
  fontSize: 8,
  contributor: {
    fiscalCode: { x0: 113.8, x1: 343, baseline: y(118.5), boxes: 16 },
    name: { x: 116, baseline: y(140.5) },
    firstName: { x: 418, baseline: y(140.5) },
    birth: {
      baseline: y(165),
      day: [121, 135.5],
      month: [151, 165.5],
      year: [181, 195.4, 209.8, 224.2],
      sex: 250.5,
      place: { x: 274 },
      province: [[538, 552.6], [552.6, 566.8]] as Cells,
    },
    city: { x: 116, baseline: y(189.5) },
    province: { cells: [[329.4, 343.8], [343.8, 358.2]] as Cells, baseline: y(189.5) },
    address: { x: 368, baseline: y(189.5) },
  },
  treasury: {
    rows: 6,
    firstBaseline: y(250.2),
    rowStep: 12,
    totalBaseline: y(322.2),
    code: [157, 213.6] as Box,
    installment: [221, 265] as Box,
    year: [272, 314] as Box,
  },
  /** "Regioni": region code, tax code, installment/month, year. */
  regional: {
    rows: 4,
    firstBaseline: y(442.2),
    rowStep: 12,
    totalBaseline: y(490.2),
    localCode: [20.6, 48] as Box,
    code: [157, 213.6] as Box,
    installment: [221, 265] as Box,
    year: [272, 314] as Box,
  },
  /** "IMU e altri tributi locali": municipality code, tax code, installment/month, year (flags left blank). */
  local: {
    rows: 4,
    firstBaseline: y(526.2),
    rowStep: 12,
    totalBaseline: y(574.2),
    localCode: [20.6, 62.4] as Box,
    code: [157, 213.6] as Box,
    installment: [221, 265] as Box,
    year: [272, 314] as Box,
  },
  inps: {
    rows: 4,
    firstBaseline: y(358.5),
    rowStep: 12,
    totalBaseline: y(406.5),
    office: [20.6, 48] as Box,
    reason: [55.7, 84.5] as Box,
    periodFrom: { month: [221, 235] as Box, year: [236, 265] as Box },
    periodTo: { month: [272, 288] as Box, year: [289, 314] as Box },
  },
  amounts: {
    debit: { intRight: 383, decimals: [[387.1, 394.2], [394.2, 401.3]] as Cells },
    credit: { intRight: 469.4, decimals: [[473.5, 480.6], [480.6, 487.7]] as Cells },
    balance: { intRight: 555.8, decimals: [[559.9, 567], [567, 574]] as Cells, signX: 489 },
  },
  finalBalance: { baseline: y(718.2), intRight: 555.8, decimals: [[559.9, 567], [567, 574]] as Cells },
  /** "Estremi del versamento" date boxes (DD MM YYYY); filled with the planned payment date as intermediaries' software does. */
  paymentDate: { baseline: y(788), day: [36, 50], month: [65, 79], year: [95, 109, 123, 137] },
};
type Box = [number, number];
/** Two-character fields split by a tick mark into two cells (cents after the printed comma, province); measured on the model's vector lines. */
type Cells = [Box, Box];

export interface F24PrintLine {
  section: 'TREASURY' | 'INPS' | 'REGIONAL' | 'LOCAL';
  code: string;
  officeCode?: string | null;
  installmentCode?: string | null;
  localCode?: string | null;
  periodFrom?: string | null;
  periodTo?: string | null;
  referenceYear: number;
  debitAmount: number;
  creditAmount: number;
}

export interface F24PrintData {
  /** Planned payment date, ISO. */
  paymentDate?: string;
  fiscalCode: string;
  /** Surname or business name. */
  name: string;
  firstName?: string | null;
  /** ISO date. */
  birthDate?: string | null;
  sex?: string | null;
  birthPlace?: string | null;
  birthProvince?: string | null;
  city: string;
  province: string;
  address: string;
  lines: F24PrintLine[];
}

@Injectable()
export class F24PdfService {
  private readonly logger = new Logger(F24PdfService.name);

  constructor(private readonly storage: StorageService) {}

  /** The official model, downloaded once and cached in the storage directory. */
  private async model(): Promise<Buffer> {
    let cached: Buffer | undefined;
    try {
      cached = await this.storage.read(MODEL_PATH);
    } catch {
      // not cached yet
    }
    if (cached) {
      this.verify(cached);
      return cached;
    }
    let bytes: Buffer;
    try {
      const res = await fetch(F24_MODEL_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      bytes = Buffer.from(await res.arrayBuffer());
    } catch (e) {
      throw new ServiceUnavailableException(`Cannot download the official F24 model from the AdE site (${(e as Error).message}); put it at storage/${MODEL_PATH}`);
    }
    this.verify(bytes);
    await this.storage.write(MODEL_PATH, bytes);
    return bytes;
  }

  private verify(bytes: Buffer) {
    const sha = createHash('sha256').update(bytes).digest('hex');
    if (sha === F24_MODEL_SHA256) return;
    const message = `F24 model SHA-256 ${sha} differs from the calibrated ${F24_MODEL_SHA256}`;
    if (process.env.F24_MODEL_ALLOW_UNVERIFIED === 'true') {
      this.logger.warn(`${message}: check the layout`);
      return;
    }
    throw new UnprocessableEntityException(`${message}: the layout may not match. Replace storage/${MODEL_PATH} with the calibrated model or set F24_MODEL_ALLOW_UNVERIFIED=true`);
  }

  async render(data: F24PrintData): Promise<Uint8Array> {
    const treasury = data.lines.filter((l) => l.section === 'TREASURY');
    const inps = data.lines.filter((l) => l.section === 'INPS');
    const regional = data.lines.filter((l) => l.section === 'REGIONAL');
    const local = data.lines.filter((l) => l.section === 'LOCAL');
    for (const [name, rows, max] of [['Treasury', treasury.length, LAYOUT.treasury.rows], ['INPS', inps.length, LAYOUT.inps.rows], ['Regional', regional.length, LAYOUT.regional.rows], ['Local', local.length, LAYOUT.local.rows]] as const) {
      if (rows > max) throw new UnprocessableEntityException(`The form has ${max} ${name} rows, ${rows} needed`);
    }

    const doc = await PDFDocument.load(await this.model());
    const font = await doc.embedFont(StandardFonts.Courier);
    // The model carries three copies (two for the bank, one for the taxpayer); a telematic payment needs one.
    while (doc.getPageCount() > 1) doc.removePage(doc.getPageCount() - 1);
    this.fillPage(doc.getPage(0), font, data, { treasury, inps, regional, local });
    return doc.save();
  }

  private fillPage(page: PDFPage, font: PDFFont, data: F24PrintData, lines: { treasury: F24PrintLine[]; inps: F24PrintLine[]; regional: F24PrintLine[]; local: F24PrintLine[] }) {
    const { treasury, inps, regional, local } = lines;
    const size = LAYOUT.fontSize;
    const text = (s: string, x: number, baseline: number) => page.drawText(s, { x, y: baseline, size, font, color: rgb(0, 0, 0) });
    const width = (s: string) => font.widthOfTextAtSize(s, size);
    const rightAligned = (s: string, xRight: number, baseline: number) => text(s, xRight - width(s), baseline);
    const centered = (s: string, box: Box | number, baseline: number) => {
      const cx = typeof box === 'number' ? box : (box[0] + box[1]) / 2;
      text(s, cx - width(s) / 2, baseline);
    };
    const inCells = (s: string, cells: Cells, baseline: number) => [...s].forEach((ch, i) => centered(ch, cells[i], baseline));
    const boxed = (s: string, box: Box, baseline: number) => {
      const w = (box[1] - box[0]) / s.length;
      [...s].forEach((ch, i) => text(ch, box[0] + w * i + (w - width(ch)) / 2, baseline));
    };
    const amount = (value: number, col: { intRight: number; decimals: Cells }, baseline: number) => {
      if (!(value > 0)) return;
      const [int, dec] = value.toFixed(2).split('.');
      rightAligned(int, col.intRight, baseline);
      inCells(dec, col.decimals, baseline);
    };

    // Contributor
    const c = LAYOUT.contributor;
    const boxWidth = (c.fiscalCode.x1 - c.fiscalCode.x0) / c.fiscalCode.boxes;
    [...data.fiscalCode.toUpperCase()].slice(0, c.fiscalCode.boxes).forEach((ch, i) => {
      const w = font.widthOfTextAtSize(ch, size);
      text(ch, c.fiscalCode.x0 + boxWidth * i + (boxWidth - w) / 2, c.fiscalCode.baseline);
    });
    text(data.name.toUpperCase(), c.name.x, c.name.baseline);
    if (data.firstName) text(data.firstName.toUpperCase(), c.firstName.x, c.firstName.baseline);
    const bd = data.birthDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (bd) {
      [...bd[3]].forEach((ch, i) => centered(ch, c.birth.day[i], c.birth.baseline));
      [...bd[2]].forEach((ch, i) => centered(ch, c.birth.month[i], c.birth.baseline));
      [...bd[1]].forEach((ch, i) => centered(ch, c.birth.year[i], c.birth.baseline));
    }
    if (data.sex) centered(data.sex.toUpperCase(), c.birth.sex, c.birth.baseline);
    if (data.birthPlace) text(data.birthPlace.toUpperCase(), c.birth.place.x, c.birth.baseline);
    if (data.birthProvince) inCells(data.birthProvince.toUpperCase(), c.birth.province, c.birth.baseline);
    text(data.city.toUpperCase(), c.city.x, c.city.baseline);
    inCells(data.province.toUpperCase(), c.province.cells, c.province.baseline);
    text(data.address.toUpperCase(), c.address.x, c.address.baseline);

    // Treasury section
    const t = LAYOUT.treasury;
    let debitA = 0;
    let creditB = 0;
    treasury.forEach((l, i) => {
      const b = t.firstBaseline - i * t.rowStep;
      centered(l.code, t.code, b);
      if (l.installmentCode) centered(l.installmentCode, t.installment, b);
      centered(String(l.referenceYear), t.year, b);
      amount(l.debitAmount, LAYOUT.amounts.debit, b);
      amount(l.creditAmount, LAYOUT.amounts.credit, b);
      debitA += l.debitAmount;
      creditB += l.creditAmount;
    });
    if (treasury.length > 0) this.totals(debitA, creditB, t.totalBaseline, amount, text, rightAligned, inCells);

    // INPS section
    const n = LAYOUT.inps;
    let debitC = 0;
    let creditD = 0;
    inps.forEach((l, i) => {
      const b = n.firstBaseline - i * n.rowStep;
      if (l.officeCode) centered(l.officeCode, n.office, b);
      centered(l.code, n.reason, b);
      const from = splitPeriod(l.periodFrom);
      const to = splitPeriod(l.periodTo);
      if (from) {
        centered(from.month, n.periodFrom.month, b);
        centered(from.year, n.periodFrom.year, b);
      }
      if (to) {
        centered(to.month, n.periodTo.month, b);
        centered(to.year, n.periodTo.year, b);
      }
      amount(l.debitAmount, LAYOUT.amounts.debit, b);
      amount(l.creditAmount, LAYOUT.amounts.credit, b);
      debitC += l.debitAmount;
      creditD += l.creditAmount;
    });
    if (inps.length > 0) this.totals(debitC, creditD, n.totalBaseline, amount, text, rightAligned, inCells);

    // Regional and local sections (credits from the return, e.g. 3844 with the municipality code)
    let regionalBalance = 0;
    let localBalance = 0;
    for (const [rows, l] of [[regional, LAYOUT.regional], [local, LAYOUT.local]] as const) {
      let debit = 0;
      let credit = 0;
      rows.forEach((line, i) => {
        const b = l.firstBaseline - i * l.rowStep;
        if (line.localCode) boxed(line.localCode, l.localCode, b); // one character per printed box
        centered(line.code, l.code, b);
        if (line.installmentCode) centered(line.installmentCode, l.installment, b);
        centered(String(line.referenceYear), l.year, b);
        amount(line.debitAmount, LAYOUT.amounts.debit, b);
        amount(line.creditAmount, LAYOUT.amounts.credit, b);
        debit += line.debitAmount;
        credit += line.creditAmount;
      });
      if (rows.length > 0) this.totals(debit, credit, l.totalBaseline, amount, text, rightAligned, inCells);
      if (l === LAYOUT.regional) regionalBalance = debit - credit;
      else localBalance = debit - credit;
    }

    // Payment date
    const d = data.paymentDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (d) {
      const pd = LAYOUT.paymentDate;
      [...d[3]].forEach((ch, i) => centered(ch, pd.day[i], pd.baseline));
      [...d[2]].forEach((ch, i) => centered(ch, pd.month[i], pd.baseline));
      [...d[1]].forEach((ch, i) => centered(ch, pd.year[i], pd.baseline));
    }

    // Final balance (EURO)
    const final = round2(debitA - creditB + (debitC - creditD) + regionalBalance + localBalance);
    const f = LAYOUT.finalBalance;
    const [int, dec] = Math.abs(final).toFixed(2).split('.');
    rightAligned(int, f.intRight, f.baseline);
    inCells(dec, f.decimals, f.baseline);
  }

  private totals(
    debit: number,
    credit: number,
    baseline: number,
    amount: (v: number, col: { intRight: number; decimals: Cells }, b: number) => void,
    text: (s: string, x: number, b: number) => void,
    rightAligned: (s: string, xRight: number, b: number) => void,
    inCells: (s: string, cells: Cells, b: number) => void,
  ) {
    amount(round2(debit), LAYOUT.amounts.debit, baseline);
    amount(round2(credit), LAYOUT.amounts.credit, baseline);
    const balance = round2(debit - credit);
    text(balance < 0 ? '-' : '+', LAYOUT.amounts.balance.signX, baseline);
    const [int, dec] = Math.abs(balance).toFixed(2).split('.');
    rightAligned(int, LAYOUT.amounts.balance.intRight, baseline);
    inCells(dec, LAYOUT.amounts.balance.decimals, baseline);
  }
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** "01/2025" → { month: "01", year: "2025" }. */
function splitPeriod(p?: string | null): { month: string; year: string } | null {
  const m = p?.match(/^(\d{2})\/(\d{4})$/);
  return m ? { month: m[1], year: m[2] } : null;
}
