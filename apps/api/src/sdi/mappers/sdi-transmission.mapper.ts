import type { SdiTransmission } from '../../generated/prisma/client.js';
import { SdiTransmissionDto } from '../dto/response/sdi-transmission.dto.js';

/** The PEC Message-ID and the SDI notifications stay out until the receipts are read. */
export const toSdiTransmissionDto = (t: SdiTransmission): SdiTransmissionDto =>
  Object.assign(new SdiTransmissionDto(), {
    id: t.id, channel: t.channel, fileName: t.fileName, status: t.status, sentAt: t.sentAt?.toISOString() ?? null, lastError: t.lastError, createdAt: t.createdAt.toISOString(),
  });
