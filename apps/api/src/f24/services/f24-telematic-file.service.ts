import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { buildF24TelematicFile, parseIsoDate } from '@opentax-it/fiscal-rules';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TenantsService } from '../../tenants/tenants.service.js';

/**
 * The F24 forms still to pay on a payment date, as the file that File Internet checks, prepares and sends
 * (packages/fiscal-rules, f24-telematic-file.ts): the whole date goes in one file, as the specification asks.
 */
@Injectable()
export class F24TelematicFileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
  ) {}

  async file(tenantId: string, date: string): Promise<{ fileName: string; content: string }> {
    const [{ profile }, forms, bank] = await Promise.all([
      this.tenants.getWithProfile(tenantId),
      this.prisma.f24.findMany({ where: { tenantId, paymentDate: parseIsoDate(date), status: 'PLANNED' }, include: { lines: true }, orderBy: { createdAt: 'asc' } }),
      this.prisma.bankAccount.findFirst({ where: { tenantId, isDefault: true } }),
    ]);
    if (forms.length === 0) throw new NotFoundException(`Nessun F24 da pagare il ${date.split('-').reverse().join('/')}`);
    // The file identifies the taxpayer with the personal data of the F24 ("Dati anagrafici").
    if (!profile.birthDate || !profile.birthPlace || !profile.birthProvince || (profile.sex !== 'M' && profile.sex !== 'F')) {
      throw new BadRequestException('Per il file servono data, comune e provincia di nascita e sesso: completali nel profilo fiscale');
    }
    try {
      const content = buildF24TelematicFile(
        {
          fiscalCode: profile.fiscalCode,
          lastName: profile.lastName,
          firstName: profile.firstName,
          sex: profile.sex,
          birthDate: profile.birthDate,
          birthPlace: profile.birthPlace,
          birthProvince: profile.birthProvince,
          iban: bank?.iban,
        },
        parseIsoDate(date),
        forms.map((f) => ({
          lines: f.lines.map((l) => ({
            section: l.section,
            code: l.code,
            officeCode: l.officeCode ?? undefined,
            installmentCode: l.installmentCode ?? undefined,
            localCode: l.localCode ?? undefined,
            positionCode: l.positionCode ?? undefined,
            periodFrom: l.periodFrom ?? undefined,
            periodTo: l.periodTo ?? undefined,
            referenceYear: l.referenceYear,
            debitAmount: Number(l.debitAmount),
            creditAmount: Number(l.creditAmount),
          })),
        })),
      );
      return { fileName: `F24_${date}.txt`, content };
    } catch (e) {
      // The generator explains in Italian what the forms lack (sections not written yet, missing codes).
      throw new BadRequestException((e as Error).message);
    }
  }
}
