export interface XmlEntry {
  /** Shown to the user and used to select entries: "archive.zip/folder/file.xml" or the file name. */
  name: string;
  /** Name of the file itself, without folders: stored with the invoice. */
  fileName: string;
  xml: string;
}
