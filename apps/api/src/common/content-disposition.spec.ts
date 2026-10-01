import { describe, expect, it } from 'vitest';
import { attachment } from './content-disposition.js';

describe('attachment', () => {
  it('keeps safe names', () => {
    expect(attachment('Fattura_1-2026.pdf')).toBe('attachment; filename="Fattura_1-2026.pdf"');
  });

  it('replaces quotes, CR/LF and non-ASCII characters', () => {
    expect(attachment('a"; filename=evil.exe\r\nX: y')).toBe('attachment; filename="a___filename_evil.exe__X__y"');
    expect(attachment('Fattura_città.pdf')).toBe('attachment; filename="Fattura_citt_.pdf"');
    expect(attachment('')).toBe('attachment; filename="download"');
  });
});
