import type { SdiNotification, SdiTransmission } from '../../generated/prisma/client.js';
import { ReceiptsSyncResultDto } from '../dto/response/receipts-sync-result.dto.js';
import { SdiNotificationDto } from '../dto/response/sdi-notification.dto.js';
import { SdiTransmissionDto } from '../dto/response/sdi-transmission.dto.js';
import { transmissionWarning } from '../services/transmission-warning.js';
import type { ReceiptsSyncResult } from '../types/receipts-sync-result.js';

/** The PEC Message-ID, the provider id, storage paths and receipt details stay out. */
export const toSdiTransmissionDto = (t: SdiTransmission & { notifications?: SdiNotification[] }): SdiTransmissionDto =>
  Object.assign(new SdiTransmissionDto(), {
    id: t.id, channel: t.channel, fileName: t.fileName, status: t.status, sentAt: t.sentAt?.toISOString() ?? null, lastError: t.lastError, createdAt: t.createdAt.toISOString(),
    sdiId: t.sdiId,
    notifications: (t.notifications ?? []).map((n) => Object.assign(new SdiNotificationDto(), { type: n.type, receivedAt: n.receivedAt.toISOString(), sdiId: n.sdiId, fileName: n.fileName })),
    warning: transmissionWarning(t),
  });

export const toReceiptsSyncResultDto = (r: ReceiptsSyncResult): ReceiptsSyncResultDto =>
  Object.assign(new ReceiptsSyncResultDto(), { status: r.status, read: r.read, matched: r.matched, message: r.message });
