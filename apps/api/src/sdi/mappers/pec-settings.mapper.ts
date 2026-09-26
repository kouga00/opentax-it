import type { PecProvider } from '@opentax-it/fatturapa';
import { PecTestEventDto } from '../dto/response/pec-test-event.dto.js';
import { PecProviderDto } from '../dto/response/pec-provider.dto.js';
import { PecSettingsDto } from '../dto/response/pec-settings.dto.js';
import type { PecTestEvent } from '../types/pec-test-event.js';
import type { PecSettings } from '../types/pec-settings.js';

export const toPecProviderDto = (p: PecProvider): PecProviderDto =>
  Object.assign(new PecProviderDto(), {
    id: p.id, name: p.name, smtpHost: p.smtpHost, smtpPort: p.smtpPort, imapHost: p.imapHost, imapPort: p.imapPort,
    usernameHint: p.usernameHint, passwordHint: p.passwordHint, clientGuideUrl: p.clientGuideUrl, sourceUrl: p.sourceUrl, verifiedOn: p.verifiedOn,
  });

export const toPecSettingsDto = (s: PecSettings): PecSettingsDto =>
  Object.assign(new PecSettingsDto(), {
    provider: s.provider, address: s.address, username: s.username, smtpHost: s.smtpHost, smtpPort: s.smtpPort, imapHost: s.imapHost, imapPort: s.imapPort,
    hasPassword: s.hasPassword, sdiPecAssigned: s.sdiPecAssigned, recipient: s.recipient, encryptionConfigured: s.encryptionConfigured,
  });

/** Server-Sent Event for NestJS @Sse: the event type tells the page how to read the data. */
export function toPecTestMessage(e: PecTestEvent): { type: string; data: PecTestEventDto } {
  const data = e.kind === 'step'
    ? Object.assign(new PecTestEventDto(), { step: e.step, status: e.status, message: e.message })
    : Object.assign(new PecTestEventDto(), { ok: e.ok, message: e.message });
  return { type: e.kind, data };
}
