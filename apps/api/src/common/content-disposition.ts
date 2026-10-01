/**
 * `attachment` Content-Disposition with a safe file name. Names can come from imported XML
 * (Numero is not validated by the XSD there): quotes, CR/LF and non-ASCII characters are
 * replaced, so they cannot inject header parameters or make Node reject the header.
 */
export function attachment(fileName: string): string {
  return `attachment; filename="${safeName(fileName)}"`;
}

/** `inline` Content-Disposition (the browser shows the file), with the same safe file name. */
export function inline(fileName: string): string {
  return `inline; filename="${safeName(fileName)}"`;
}

function safeName(fileName: string): string {
  return fileName.replace(/[^A-Za-z0-9._-]/g, '_') || 'download';
}
