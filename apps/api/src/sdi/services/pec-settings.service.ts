import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OTHER_PEC_PROVIDER, pecProvider, SDI_FIRST_PEC_ADDRESS } from '@opentax-it/fatturapa';
import { decryptSecret, encryptionConfigured, encryptSecret } from '../../common/secret-cipher.js';
import type { TenantProfile } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { SavePecSettingsDto } from '../dto/request/save-pec-settings.dto.js';
import type { ConnectionCheck } from '../types/connection-check.js';
import type { PecConnection } from '../types/pec-connection.js';
import type { PecSettings } from '../types/pec-settings.js';
import { PecMailerService } from './pec-mailer.service.js';

/** PEC mailbox of the tenant, used to send invoices to SDI (spec 1.9.1 §1.3.1). The password is stored encrypted. */
@Injectable()
export class PecSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: PecMailerService,
  ) {}

  private async profile(tenantId: string): Promise<TenantProfile> {
    const profile = await this.prisma.tenantProfile.findUnique({ where: { tenantId } });
    if (!profile) throw new NotFoundException('Tenant profile not found');
    return profile;
  }

  async get(tenantId: string): Promise<PecSettings> {
    const p = await this.profile(tenantId);
    const preset = pecProvider(p.pecProvider);
    return {
      provider: p.pecProvider,
      address: p.pecAddress,
      username: p.pecUsername,
      smtpHost: preset?.smtpHost ?? p.pecSmtpHost,
      smtpPort: preset?.smtpPort ?? p.pecSmtpPort,
      imapHost: preset?.imapHost ?? p.pecImapHost,
      imapPort: preset?.imapPort ?? p.pecImapPort,
      hasPassword: Boolean(p.pecPasswordEnc),
      sdiPecAssigned: p.sdiPecAssigned,
      recipient: p.sdiPecAssigned ?? SDI_FIRST_PEC_ADDRESS,
      encryptionConfigured: encryptionConfigured(),
    };
  }

  async save(tenantId: string, dto: SavePecSettingsDto): Promise<PecSettings> {
    await this.profile(tenantId);
    if (dto.password && !encryptionConfigured()) {
      throw new BadRequestException('Per salvare la password serve APP_ENCRYPTION_KEY nel file .env (32 byte in base64: openssl rand -base64 32).');
    }
    const other = dto.provider === OTHER_PEC_PROVIDER;
    const username = dto.username?.trim();
    await this.prisma.tenantProfile.update({
      where: { tenantId },
      data: {
        pecProvider: dto.provider,
        pecAddress: dto.address,
        pecUsername: username && username !== dto.address ? username : null,
        // Presets keep their servers in PEC_PROVIDERS, so that a corrected preset reaches every tenant.
        pecSmtpHost: other ? dto.smtpHost : null,
        pecSmtpPort: other ? dto.smtpPort : null,
        pecImapHost: other ? dto.imapHost : null,
        pecImapPort: other ? dto.imapPort : null,
        ...(dto.password ? { pecPasswordEnc: encryptSecret(dto.password) } : {}),
        sdiPecAssigned: dto.sdiPecAssigned || null,
      },
    });
    return this.get(tenantId);
  }

  /** Complete settings with the decrypted password; a readable error when something is missing. */
  async connection(tenantId: string): Promise<PecConnection> {
    const p = await this.profile(tenantId);
    const s = await this.get(tenantId);
    if (!s.address || !s.smtpHost || !s.smtpPort || !s.imapHost || !s.imapPort || !p.pecPasswordEnc) {
      throw new BadRequestException('Configura la casella PEC in Impostazioni (indirizzo, server e password).');
    }
    if (!encryptionConfigured()) throw new BadRequestException('APP_ENCRYPTION_KEY non è impostata: la password PEC salvata non si può leggere.');
    let password: string;
    try {
      password = decryptSecret(p.pecPasswordEnc);
    } catch {
      throw new BadRequestException('La password PEC salvata non si può leggere con l\'attuale APP_ENCRYPTION_KEY: inseriscila di nuovo in Impostazioni.');
    }
    return { address: s.address, username: s.username ?? s.address, password, smtpHost: s.smtpHost, smtpPort: s.smtpPort, imapHost: s.imapHost, imapPort: s.imapPort };
  }

  /** Logs in to both servers without sending anything. */
  async test(tenantId: string): Promise<{ smtp: ConnectionCheck; imap: ConnectionCheck }> {
    const c = await this.connection(tenantId);
    const [smtp, imap] = await Promise.all([this.mailer.checkSmtp(c), this.mailer.checkImap(c)]);
    return { smtp, imap };
  }
}
