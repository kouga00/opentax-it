import { unzipSync } from 'fflate';
import type { IgnoredEntry } from './ignored-entry.js';
import type { UploadedFile } from './uploaded-file.js';
import type { XmlEntry } from './xml-entry.js';

/**
 * Turns the uploaded files (XML files and ZIP archives of them, e.g. downloaded from the AdE portal "Fatture e
 * Corrispettivi" or from another software) into the XML documents to import; what each one is gets decided by the
 * import handlers (imports module).
 *
 * Reference: Spec. FatturaPA 1.9.1 §1.2.2 (archive of invoice files, "il formato di compressione
 * accettato è il formato ZIP") and the 5 MB limit per invoice file. No official source describes the
 * layout of the portal download, so folders are allowed and entries are recognised by their content.
 *
 * Zip bombs: fflate allocates each entry with the size declared in the archive and does not grow it
 * (inflateSync with a fixed output buffer), so filtering on the declared sizes bounds the memory used.
 */

/** Spec. FatturaPA 1.9.1: "Il singolo file fattura non può superare la dimensione di 5MB". */
export const MAX_INVOICE_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ARCHIVE_ENTRIES = 2000;
export const MAX_ARCHIVE_EXTRACTED_BYTES = 200 * 1024 * 1024;

const TOO_LARGE = 'Supera 5 MB, il limite SDI per un file fattura';

export function extractXmlEntries(files: UploadedFile[]): { entries: XmlEntry[]; ignored: IgnoredEntry[] } {
  const entries: XmlEntry[] = [];
  const ignored: IgnoredEntry[] = [];
  const add = (name: string, content: Uint8Array) => {
    if (content.length > MAX_INVOICE_FILE_BYTES) return ignored.push({ name, message: TOO_LARGE });
    const xml = Buffer.from(content).toString('utf8');
    entries.push({ name, fileName: baseName(name), xml });
  };

  for (const f of files) {
    if (isZip(f.content)) readZip(f, add, ignored);
    else if (/\.xml$/i.test(f.name)) add(f.name, f.content);
    else ignored.push({ name: f.name, message: unsupported(f.name) });
  }
  return { entries, ignored };
}

function readZip(f: UploadedFile, add: (name: string, content: Uint8Array) => void, ignored: IgnoredEntry[]) {
  let count = 0;
  let declared = 0;
  let limit: string | undefined;
  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(new Uint8Array(f.content.buffer, f.content.byteOffset, f.content.length), {
      filter: (e) => {
        if (limit || e.name.endsWith('/')) return false; // over a limit already, or a folder
        const name = `${f.name}/${e.name}`;
        if (++count > MAX_ARCHIVE_ENTRIES) limit = `Contiene più di ${MAX_ARCHIVE_ENTRIES} file`;
        else if (!/\.xml$/i.test(e.name)) ignored.push({ name, message: unsupported(e.name) });
        else if (e.originalSize > MAX_INVOICE_FILE_BYTES) ignored.push({ name, message: TOO_LARGE });
        else if ((declared += e.originalSize) > MAX_ARCHIVE_EXTRACTED_BYTES) limit = 'Contenuto estratto oltre 200 MB';
        else return true;
        return false;
      },
    });
  } catch {
    ignored.push({ name: f.name, message: 'Archivio ZIP non leggibile' });
    return;
  }
  if (limit) {
    ignored.push({ name: f.name, message: `${limit}: dividilo in archivi più piccoli` });
    return;
  }
  if (count === 0) {
    ignored.push({ name: f.name, message: 'Archivio ZIP vuoto' });
    return;
  }
  for (const [name, content] of Object.entries(unzipped)) add(`${f.name}/${name}`, content);
}

/**
 * ZIP signatures (PKWARE APPNOTE): a local file header "PK\x03\x04" at the start, or, for an archive with no files,
 * the end of central directory record "PK\x05\x06".
 */
function isZip(content: Buffer): boolean {
  if (content.length < 4) return false;
  const signature = content.readUInt32LE(0);
  return signature === 0x04034b50 || signature === 0x06054b50;
}

function baseName(path: string): string {
  return path.slice(Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')) + 1);
}

function unsupported(name: string): string {
  return /\.p7m$/i.test(name) ? 'Fattura firmata (.p7m): non ancora supportata' : 'Non è un file XML o ZIP';
}
