/** Where to resume reading the inbox: the saved UIDVALIDITY and last UID, or a date to rescan from when they are unusable. */
export interface InboxCursor {
  uidValidity?: bigint;
  lastUid?: bigint;
  since?: Date;
}
