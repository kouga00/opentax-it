import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { paymentMethodLabel } from '@opentax-it/fatturapa';
import type { CourtesyInvoice } from '../types/courtesy-invoice.js';

export type InvoicePdfData = CourtesyInvoice;

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 40;
const MARGIN_RIGHT = 555.28;
const CONTENT_WIDTH = MARGIN_RIGHT - MARGIN_LEFT;

const TYPE_NAMES: Record<string, string> = {
  TD01: 'FATTURA',
  TD04: 'NOTA DI CREDITO',
  TD05: 'NOTA DI DEBITO',
  TD06: 'PARCELLA',
};

function formatCurrency(n: unknown, currency = 'EUR'): string {
  const num = typeof n === 'number' ? n : Number(String(n));
  const formatted = num.toFixed(2).replace('.', ',');
  // Add thousands separator
  const [intPart, decPart] = formatted.split(',');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withThousands},${decPart} ${currency}`;
}

function formatDate(date: Date | string): string {
  if (!date) return '';
  const str = typeof date === 'string' ? date : date.toISOString();
  const [y, m, d] = str.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/** Sanitize text to fit standard PDF Helvetica (WinAnsi encoding). */
function cleanPdfText(text: string): string {
  return text
    .replace(/\u2013|\u2014/g, '-')
    .replace(/\u2018|\u2019|\u201A/g, "'")
    .replace(/\u201C|\u201D|\u201E/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/\u20AC/g, 'EUR')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

function breakWord(word: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
    return [word];
  }
  const chunks: string[] = [];
  let cur = '';
  for (const char of word) {
    if (font.widthOfTextAtSize(cur + char, fontSize) <= maxWidth) {
      cur += char;
    } else {
      if (cur) chunks.push(cur);
      cur = char;
    }
  }
  if (cur) chunks.push(cur);
  return chunks.length ? chunks : [word];
}

function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] {
  const cleaned = cleanPdfText(text);
  const paragraphs = cleaned.split(/\r?\n/);
  const resultLines: string[] = [];

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) {
      resultLines.push('');
      continue;
    }

    const words = trimmed.split(/\s+/);
    let currentLine = '';

    for (const rawWord of words) {
      const wordChunks = breakWord(rawWord, maxWidth, font, fontSize);

      for (const chunk of wordChunks) {
        if (!currentLine) {
          currentLine = chunk;
        } else {
          const testLine = `${currentLine} ${chunk}`;
          if (font.widthOfTextAtSize(testLine, fontSize) <= maxWidth) {
            currentLine = testLine;
          } else {
            resultLines.push(currentLine);
            currentLine = chunk;
          }
        }
      }
    }
    if (currentLine) {
      resultLines.push(currentLine);
    }
  }

  return resultLines.length ? resultLines : [''];
}

@Injectable()
export class InvoicesPdfService {
  async generate(data: CourtesyInvoice): Promise<Uint8Array> {
    const doc = await PDFDocument.create();

    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

    const pages: PDFPage[] = [];
    let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);

    let y = PAGE_HEIGHT - 40;

    const newPage = () => {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pages.push(page);
      y = PAGE_HEIGHT - 40;
      // Header on continuation pages
      page.drawText(cleanPdfText(`${TYPE_NAMES[data.documentType] ?? 'FATTURA'} N. ${data.number || '(BOZZA)'} (continua)`), {
        x: MARGIN_LEFT,
        y,
        size: 9,
        font: fontItalic,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 25;
    };

    // --- 1. HEADER & SUPPLIER INFO ---
    const isDraft = data.isDraft || !data.number;
    const docTitle = isDraft ? 'BOZZA - non valida ai fini fiscali' : (TYPE_NAMES[data.documentType] ?? 'FATTURA');

    // Right: Document title & meta box
    page.drawText(cleanPdfText(docTitle), {
      x: 350,
      y,
      size: isDraft ? 11 : 16,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.4),
    });

    const docNumber = data.number ? `N. ${data.number}` : 'Bozza';
    page.drawText(`Numero: ${cleanPdfText(docNumber)}`, { x: 350, y: y - 18, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(`Data: ${formatDate(data.date)}`, { x: 350, y: y - 32, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(`Valuta: ${data.currency}`, { x: 350, y: y - 46, size: 9, font, color: rgb(0.2, 0.2, 0.2) });

    // Left: Supplier Info
    page.drawText(cleanPdfText(data.supplier.name), { x: MARGIN_LEFT, y, size: 13, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

    let sy = y - 16;
    const taxRegimeStr = `Regime Fiscale: ${data.supplier.taxRegime}${data.supplier.taxRegime === 'RF19' ? ' - Regime forfettario' : ''}`;
    page.drawText(cleanPdfText(taxRegimeStr), { x: MARGIN_LEFT, y: sy, size: 8.5, font: fontItalic, color: rgb(0.3, 0.3, 0.3) });
    sy -= 12;
    page.drawText(`P.IVA: ${data.supplier.vatNumber || '-'}   C.F.: ${data.supplier.fiscalCode || '-'}`, { x: MARGIN_LEFT, y: sy, size: 8.5, font, color: rgb(0.2, 0.2, 0.2) });
    sy -= 12;
    const suppAddr = [data.supplier.address, [data.supplier.postalCode, data.supplier.city].filter(Boolean).join(' '), data.supplier.province ? `(${data.supplier.province})` : '', data.supplier.country ? `- ${data.supplier.country}` : ''].filter(Boolean).join(' ');
    page.drawText(cleanPdfText(suppAddr), {
      x: MARGIN_LEFT,
      y: sy,
      size: 8.5,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    if (data.supplier.pec) {
      sy -= 12;
      page.drawText(`PEC: ${cleanPdfText(data.supplier.pec)}`, { x: MARGIN_LEFT, y: sy, size: 8.5, font, color: rgb(0.2, 0.2, 0.2) });
    }

    y = Math.min(sy, y - 65) - 20;

    // Divider line
    page.drawLine({ start: { x: MARGIN_LEFT, y }, end: { x: MARGIN_RIGHT, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    y -= 15;

    // --- 2. CUSTOMER BOX ---
    const customerBoxY = y;
    const c = data.customer;

    // Box background
    page.drawRectangle({
      x: MARGIN_LEFT,
      y: customerBoxY - 60,
      width: CONTENT_WIDTH,
      height: 60,
      color: rgb(0.97, 0.98, 0.99),
      borderColor: rgb(0.85, 0.87, 0.9),
      borderWidth: 0.5,
    });

    page.drawText('DESTINATARIO / CLIENTE', { x: MARGIN_LEFT + 10, y: customerBoxY - 14, size: 8, font: fontBold, color: rgb(0.3, 0.4, 0.5) });
    page.drawText(cleanPdfText(c.name), { x: MARGIN_LEFT + 10, y: customerBoxY - 28, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

    const custAddress = [c.address, [c.postalCode, c.city].filter(Boolean).join(' '), c.province ? `(${c.province})` : (c.country ? `(${c.country})` : '')].filter(Boolean).join(' ');
    page.drawText(cleanPdfText(custAddress), { x: MARGIN_LEFT + 10, y: customerBoxY - 41, size: 8.5, font, color: rgb(0.25, 0.25, 0.25) });

    const idText = `P.IVA: ${c.vatNumber || '-'}   C.F.: ${c.fiscalCode || '-'}   Cod. SDI: ${c.recipientCode || '-'}${c.pec ? `   PEC: ${c.pec}` : ''}`;
    page.drawText(cleanPdfText(idText), { x: MARGIN_LEFT + 10, y: customerBoxY - 53, size: 8.5, font, color: rgb(0.25, 0.25, 0.25) });

    y = customerBoxY - 75;

    // --- 3. ITEMS TABLE ---
    const tableHeaderY = y;
    page.drawRectangle({
      x: MARGIN_LEFT,
      y: tableHeaderY - 16,
      width: CONTENT_WIDTH,
      height: 18,
      color: rgb(0.92, 0.94, 0.96),
    });

    const colX = {
      num: MARGIN_LEFT + 6,
      desc: MARGIN_LEFT + 30,
      qty: 320,
      unitPrice: 390,
      vat: 460,
      total: MARGIN_RIGHT - 6,
    };

    page.drawText('#', { x: colX.num, y: tableHeaderY - 12, size: 8, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('Descrizione', { x: colX.desc, y: tableHeaderY - 12, size: 8, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('Q.ta', { x: colX.qty - 20, y: tableHeaderY - 12, size: 8, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('Prezzo Unit.', { x: colX.unitPrice - 40, y: tableHeaderY - 12, size: 8, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('IVA / Natura', { x: colX.vat - 35, y: tableHeaderY - 12, size: 8, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('Totale', { x: colX.total - 30, y: tableHeaderY - 12, size: 8, font: fontBold, color: rgb(0.2, 0.2, 0.2) });

    y = tableHeaderY - 24;

    for (const line of data.lines) {
      const descLines = wrapText(line.description, 260, font, 8.5);
      const rowHeight = Math.max(16, descLines.length * 11 + 6);

      if (y - rowHeight < 160) newPage();

      // Line number
      page.drawText(String(line.lineNumber), { x: colX.num, y: y - 10, size: 8.5, font, color: rgb(0.3, 0.3, 0.3) });

      // Description lines
      descLines.forEach((dl, i) => {
        page.drawText(dl, { x: colX.desc, y: y - 10 - i * 11, size: 8.5, font, color: rgb(0.15, 0.15, 0.15) });
      });

      // Quantity
      const qtyStr = line.quantity !== undefined ? `${Number(line.quantity)} ${line.unit ?? ''}`.trim() : '—';
      const qtyW = font.widthOfTextAtSize(qtyStr, 8.5);
      page.drawText(cleanPdfText(qtyStr), { x: colX.qty - qtyW, y: y - 10, size: 8.5, font, color: rgb(0.2, 0.2, 0.2) });

      // Unit Price
      const upStr = formatCurrency(line.unitPrice, data.currency);
      const upW = font.widthOfTextAtSize(upStr, 8.5);
      page.drawText(cleanPdfText(upStr), { x: colX.unitPrice - upW, y: y - 10, size: 8.5, font, color: rgb(0.2, 0.2, 0.2) });

      // VAT Nature
      const vatLabel = `0% ${line.vatNature || 'N2.2'}`;
      const vatW = font.widthOfTextAtSize(vatLabel, 8.5);
      page.drawText(vatLabel, { x: colX.vat - vatW, y: y - 10, size: 8.5, font, color: rgb(0.3, 0.3, 0.3) });

      // Total Price
      const tpStr = formatCurrency(line.totalPrice, data.currency);
      const tpW = fontBold.widthOfTextAtSize(tpStr, 8.5);
      page.drawText(cleanPdfText(tpStr), { x: colX.total - tpW, y: y - 10, size: 8.5, font: fontBold, color: rgb(0.1, 0.1, 0.1) });

      y -= rowHeight;
      page.drawLine({ start: { x: MARGIN_LEFT, y: y + 2 }, end: { x: MARGIN_RIGHT, y: y + 2 }, thickness: 0.3, color: rgb(0.9, 0.9, 0.9) });
    }

    y -= 10;

    // --- 4. TOTALS SUMMARY & PAYMENT ---
    if (y < 210) newPage();

    const summaryY = y;
    const totalsLeft = 340;
    const totalsRight = MARGIN_RIGHT - 6;

    const drawTotalLine = (label: string, val: string, isBold = false) => {
      const f = isBold ? fontBold : font;
      const s = isBold ? 9.5 : 8.5;
      page.drawText(label, { x: totalsLeft, y: y - 8, size: s, font: f, color: rgb(0.2, 0.2, 0.2) });
      const valW = f.widthOfTextAtSize(val, s);
      page.drawText(val, { x: totalsRight - valW, y: y - 8, size: s, font: f, color: rgb(0.1, 0.1, 0.1) });
      y -= 14;
    };

    drawTotalLine('Imponibile:', formatCurrency(data.taxableAmount, data.currency));

    if (Number(data.inpsSurcharge) > 0) {
      const inpsLabel = data.inpsRatePct ? `Rivalsa INPS ${data.inpsRatePct}%:` : 'Rivalsa INPS:';
      drawTotalLine(inpsLabel, formatCurrency(data.inpsSurcharge, data.currency));
    }

    drawTotalLine('IVA (0%):', `0,00 ${data.currency}`);

    if (data.virtualStamp) {
      drawTotalLine('Bollo virtuale:', formatCurrency(data.stampAmount, data.currency));
    }

    // Grand total box
    y -= 4;
    page.drawRectangle({
      x: totalsLeft - 5,
      y: y - 14,
      width: MARGIN_RIGHT - totalsLeft + 5,
      height: 20,
      color: rgb(0.93, 0.95, 0.98),
      borderColor: rgb(0.7, 0.8, 0.9),
      borderWidth: 0.5,
    });
    const totLabel = 'TOTALE DOCUMENTO:';
    const totVal = formatCurrency(data.total, data.currency);
    page.drawText(totLabel, { x: totalsLeft, y: y - 9, size: 9.5, font: fontBold, color: rgb(0.05, 0.15, 0.35) });
    const totValW = fontBold.widthOfTextAtSize(totVal, 10);
    page.drawText(cleanPdfText(totVal), { x: totalsRight - totValW, y: y - 9, size: 10, font: fontBold, color: rgb(0.05, 0.15, 0.35) });

    // Payment details on the left side of summary
    if (data.payment) {
      let py = summaryY;
      page.drawText('MODALITA DI PAGAMENTO', { x: MARGIN_LEFT, y: py - 8, size: 8, font: fontBold, color: rgb(0.3, 0.4, 0.5) });
      py -= 14;
      if (data.payment.method) {
        page.drawText(`Metodo: ${paymentMethodLabel(data.payment.method)}`, {
          x: MARGIN_LEFT,
          y: py - 8,
          size: 8.5,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        py -= 12;
      }
      if (data.payment.dueDate) {
        page.drawText(`Scadenza: ${formatDate(data.payment.dueDate)}`, { x: MARGIN_LEFT, y: py - 8, size: 8.5, font, color: rgb(0.2, 0.2, 0.2) });
        py -= 12;
      }
      if (data.payment.iban) {
        const ibanLines = wrapText(`IBAN: ${data.payment.iban}`, 250, fontBold, 8.5);
        ibanLines.forEach((il) => {
          page.drawText(il, { x: MARGIN_LEFT, y: py - 8, size: 8.5, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
          py -= 12;
        });
      }
      if (data.payment.bic) {
        page.drawText(`BIC: ${data.payment.bic}`, { x: MARGIN_LEFT, y: py - 8, size: 8.5, font, color: rgb(0.2, 0.2, 0.2) });
        py -= 12;
      }
    }

    y -= 30;

    // --- 5. STATUTORY NOTES & NOTES ---
    if (data.notes && data.notes.length > 0) {
      if (y < 120) newPage();

      page.drawText('DICITURE NORMATIVE E ANNOTAZIONI', { x: MARGIN_LEFT, y, size: 7.5, font: fontBold, color: rgb(0.3, 0.4, 0.5) });
      y -= 12;

      for (const note of data.notes) {
        const noteLines = wrapText(note, CONTENT_WIDTH - 12, font, 7.5);
        if (y - noteLines.length * 10 < 50) newPage();

        page.drawRectangle({
          x: MARGIN_LEFT,
          y: y - noteLines.length * 10 - 2,
          width: CONTENT_WIDTH,
          height: noteLines.length * 10 + 4,
          color: rgb(0.98, 0.98, 0.98),
          borderColor: rgb(0.9, 0.9, 0.9),
          borderWidth: 0.3,
        });

        noteLines.forEach((nl, i) => {
          page.drawText(nl, { x: MARGIN_LEFT + 6, y: y - 8 - i * 10, size: 7.5, font, color: rgb(0.2, 0.2, 0.2) });
        });

        y -= noteLines.length * 10 + 6;
      }
    }

    // --- 6. FOOTER ON ALL PAGES ---
    const totalPages = pages.length;
    pages.forEach((p, idx) => {
      p.drawLine({ start: { x: MARGIN_LEFT, y: 32 }, end: { x: MARGIN_RIGHT, y: 32 }, thickness: 0.3, color: rgb(0.8, 0.8, 0.8) });

      const disclaimer = "Copia di cortesia. L'originale e il file XML trasmesso tramite il Sistema di Interscambio.";
      p.drawText(disclaimer, {
        x: MARGIN_LEFT,
        y: 22,
        size: 7,
        font: fontItalic,
        color: rgb(0.5, 0.5, 0.5),
      });

      const pageNumStr = `Pagina ${idx + 1} di ${totalPages}`;
      const pnWidth = font.widthOfTextAtSize(pageNumStr, 7.5);
      p.drawText(pageNumStr, {
        x: MARGIN_RIGHT - pnWidth,
        y: 22,
        size: 7.5,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    });

    return doc.save();
  }
}
