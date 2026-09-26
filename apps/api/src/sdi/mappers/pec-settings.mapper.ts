import type { PecProvider } from '@opentax-it/fatturapa';
import { ConnectionCheckDto } from '../dto/response/connection-check.dto.js';
import { PecConnectionTestDto } from '../dto/response/pec-connection-test.dto.js';
import { PecProviderDto } from '../dto/response/pec-provider.dto.js';
import { PecSettingsDto } from '../dto/response/pec-settings.dto.js';
import type { ConnectionCheck } from '../types/connection-check.js';
import type { PecSettings } from '../types/pec-settings.js';

export const toPecProviderDto = (p: PecProvider): PecProviderDto =>
  Object.assign(new PecProviderDto(), {
    id: p.id, name: p.name, smtpHost: p.smtpHost, smtpPort: p.smtpPort, imapHost: p.imapHost, imapPort: p.imapPort,
    usernameHint: p.usernameHint, passwordHint: p.passwordHint, sourceUrl: p.sourceUrl, verifiedOn: p.verifiedOn,
  });

export const toPecSettingsDto = (s: PecSettings): PecSettingsDto =>
  Object.assign(new PecSettingsDto(), {
    provider: s.provider, address: s.address, username: s.username, smtpHost: s.smtpHost, smtpPort: s.smtpPort, imapHost: s.imapHost, imapPort: s.imapPort,
    hasPassword: s.hasPassword, sdiPecAssigned: s.sdiPecAssigned, recipient: s.recipient, encryptionConfigured: s.encryptionConfigured,
  });

const toCheck = (c: ConnectionCheck) => Object.assign(new ConnectionCheckDto(), { ok: c.ok, message: c.message });

export const toPecConnectionTestDto = (r: { smtp: ConnectionCheck; imap: ConnectionCheck }): PecConnectionTestDto =>
  Object.assign(new PecConnectionTestDto(), { smtp: toCheck(r.smtp), imap: toCheck(r.imap) });
