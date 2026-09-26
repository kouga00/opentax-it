import { Injectable } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import type { InboxCursor } from '../types/inbox-cursor.js';
import type { PecConnection } from '../types/pec-connection.js';
import { PEC_TIMEOUTS } from './pec-connection-options.js';

/** Largest message read from the mailbox: the 30 MB an SDI message may reach (Spec. 1.9.1 §1.3.1) plus the PEC envelope. */
const MAX_MESSAGE_BYTES = 40 * 1024 * 1024;

/**
 * IMAP side of the PEC mailbox (imapflow): logging in for the connection test and reading the inbox for receipts.
 * Errors are the library's own; the library logger stays off so that credentials never reach the logs.
 */
@Injectable()
export class PecImapService {
  private client(c: PecConnection): ImapFlow {
    const client = new ImapFlow({ host: c.imapHost, port: c.imapPort, secure: true, auth: { user: c.username, pass: c.password }, logger: false, ...PEC_TIMEOUTS });
    client.on('error', () => undefined); // connection errors also reject the pending call; without a listener they would crash the process
    return client;
  }

  /**
   * Connects and logs in, then logs out. imapflow does both in connect(), with no public way to stop in between: which
   * step failed is told by the error (pec-errors.ts, pecErrorStep).
   */
  async login(c: PecConnection): Promise<void> {
    const client = this.client(c);
    try {
      await client.connect();
      await client.logout();
    } catch (err) {
      client.close();
      throw err;
    }
  }

  /**
   * Reads the inbox from the cursor, in UID order, handing each message to `handle`; the caller saves the UID after
   * each one, so that a failure resumes from there. The mailbox is opened read-only (EXAMINE) and messages are
   * fetched with BODY.PEEK: nothing is moved, deleted or marked as read. When the saved UIDVALIDITY no longer matches
   * (RFC 9051 §2.3.1.1) the UIDs are meaningless and the inbox is searched from `since`; without either, reading
   * starts after the newest message. Resolves with the UIDVALIDITY and the last UID to save.
   */
  async readInbox(c: PecConnection, cursor: InboxCursor, handle: (message: { uidValidity: bigint; uid: bigint; source: Buffer }) => Promise<void>): Promise<{ uidValidity: bigint; lastUid: bigint }> {
    const client = this.client(c);
    await client.connect();
    try {
      const lock = await client.getMailboxLock('INBOX', { readOnly: true });
      try {
        if (!client.mailbox) throw new Error('INBOX not open');
        const { uidValidity, uidNext } = client.mailbox;
        const newest = BigInt(uidNext) - 1n;
        const resume = cursor.uidValidity === uidValidity && cursor.lastUid !== undefined ? cursor.lastUid : undefined;
        let range: string | undefined;
        if (resume !== undefined) range = resume < newest ? `${resume + 1n}:*` : undefined;
        else if (cursor.since) range = ((await client.search({ since: cursor.since }, { uid: true })) || []).join(',') || undefined;
        if (!range) return { uidValidity, lastUid: resume ?? newest };

        // Sizes first, then one message at a time: no IMAP command may run inside a fetch loop, and large ones are skipped.
        const list = (await client.fetchAll(range, { uid: true, size: true }, { uid: true }))
          .filter((m) => resume === undefined || BigInt(m.uid) > resume)
          .sort((a, b) => a.uid - b.uid);
        for (const m of list) {
          if ((m.size ?? 0) > MAX_MESSAGE_BYTES) continue;
          const msg = await client.fetchOne(String(m.uid), { uid: true, source: true }, { uid: true });
          if (msg && msg.source) await handle({ uidValidity, uid: BigInt(m.uid), source: msg.source });
        }
        // After a rescan every message up to the newest has been considered, whatever its date.
        if (resume === undefined) return { uidValidity, lastUid: newest };
        return { uidValidity, lastUid: list.length ? BigInt(list[list.length - 1].uid) : resume };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => client.close());
    }
  }
}
