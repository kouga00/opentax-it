import { PecProbeStatusDto } from '../dto/response/pec-probe-status.dto.js';
import { SdiReplyDto } from '../dto/response/sdi-reply.dto.js';
import type { PecProbeStatus } from '../types/pec-probe-status.js';

export const toPecProbeStatusDto = (s: PecProbeStatus): PecProbeStatusDto =>
  Object.assign(new PecProbeStatusDto(), {
    sentAt: s.sentAt?.toISOString() ?? null,
    recipient: s.recipient,
    acceptedAt: s.acceptedAt?.toISOString(),
    deliveredAt: s.deliveredAt?.toISOString(),
    providerError: s.providerError,
    sdiReply: s.sdiReply && Object.assign(new SdiReplyDto(), { from: s.sdiReply.from, subject: s.sdiReply.subject, receivedAt: s.sdiReply.receivedAt?.toISOString(), text: s.sdiReply.text }),
  });
