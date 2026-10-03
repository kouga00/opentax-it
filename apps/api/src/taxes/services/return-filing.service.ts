import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type ReturnRow, roundCents } from '@opentax-it/fiscal-rules';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { FiledReturn } from '../types/filed-return.js';
import { ReturnGuideService } from './return-guide.service.js';
import { TaxesService } from './taxes.service.js';

const value = (rows: ReturnRow[], id: string) => {
  const v = rows.find((r) => r.id === id)?.value;
  return typeof v === 'number' ? v : 0;
};

/**
 * The return marked as filed by the taxpayer (TaxReturn, one per year), with the credits it gives put in the credit
 * registry for the F24 compensations: the substitute tax credit to compensate (RX31 col. 5, code 1792, per the
 * registry schema "LM47 → 1792") and the Gestione Separata credit to compensate (RR8 col. 2, the contribution reason,
 * "indicando come periodo di riferimento esclusivamente l'anno", booklet 2). The Artigiani and Commercianti credits are
 * left out: their F24 rows need the 17-digit INPS code, which the registry does not hold yet. The previous year's
 * substitute tax credits, reported in LM43, are closed by the filed return (`absorbedByReturnId`).
 */
@Injectable()
export class ReturnFilingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guides: ReturnGuideService,
    private readonly taxes: TaxesService,
  ) {}

  async get(tenantId: string, year: number): Promise<FiledReturn | null> {
    const filed = await this.prisma.taxReturn.findUnique({
      where: { tenantId_year: { tenantId, year } },
      include: { credits: { select: { id: true, section: true, code: true, referenceYear: true, amount: true } } },
    });
    if (!filed || filed.status !== 'FILED' || !filed.filedOn) return null;
    return {
      filedOn: filed.filedOn.toISOString().slice(0, 10),
      credits: filed.credits.map((c) => ({ id: c.id, section: c.section, code: c.code, referenceYear: c.referenceYear, amount: Number(c.amount) })),
    };
  }

  async markFiled(tenantId: string, year: number, filedOn: string): Promise<FiledReturn> {
    if (await this.get(tenantId, year)) throw new ConflictException(`La dichiarazione dei redditi ${year} è già segnata come presentata`);
    const [guide, summary, { incomeRules }] = await Promise.all([this.guides.guide(tenantId, year), this.taxes.summary(tenantId, year), this.taxes.rulesForTaxYear(year)]);
    const rows = Object.fromEntries(guide.forms.map((f) => [f.id, f.rows]));
    const lm = rows.LM ?? [];
    const rr = rows.RR ?? [];
    const rx = rows.RX ?? [];
    const { result, input } = summary;
    const credits = [
      { section: 'TREASURY' as const, code: incomeRules.taxCodes.substituteTaxBalance, amount: value(rx, 'RX31.5'), description: `Credito imposta sostitutiva ${year} (dichiarazione, RX31)` },
      ...(summary.contributions.scheme === 'INPS_SEPARATE'
        ? [{ section: 'INPS' as const, code: input.inpsRatePct === incomeRules.inps.reducedRatePct ? incomeRules.inpsReasons.contributionReducedRate : incomeRules.inpsReasons.contribution, amount: value(rr, 'RR8.2'), description: `Credito contributi Gestione Separata ${year} (dichiarazione, RR8)` }]
        : []),
    ].filter((c) => c.amount > 0);
    const data = {
      collectedRevenue: summary.collectedRevenue,
      coefficient: result.coefficientPct,
      grossIncome: result.grossIncome,
      contributionsPaid: value(lm, 'LM35.1'),
      contributionsDeducted: result.contributionsDeducted,
      netIncome: result.netIncome,
      taxRate: result.taxRatePct,
      substituteTax: result.substituteTax,
      previousCredit: value(lm, 'LM43'),
      previousCreditUsed: value(lm, 'LM44'),
      advancesPaid: value(lm, 'LM45.2'),
      taxDue: value(lm, 'LM46'),
      taxCredit: value(lm, 'LM47'),
      inpsTaxableIncome: result.inpsTaxableIncome,
      inpsRate: input.inpsRatePct,
      inpsContributionDue: result.inpsContribution,
      inpsAdvancesPaid: input.inpsAdvancesPaid,
      inpsDue: roundCents(Math.max(0, summary.inpsBalance)),
      inpsCredit: roundCents(Math.max(0, -summary.inpsBalance)),
      nextYearTaxAdvance: summary.nextYearAdvances.tax.total,
      nextYearInpsAdvance: summary.nextYearAdvances.inps.total,
      status: 'FILED' as const,
      filedOn: new Date(`${filedOn}T00:00:00Z`),
    };
    await this.prisma.$transaction(async (tx) => {
      const taxReturn = await tx.taxReturn.upsert({ where: { tenantId_year: { tenantId, year } }, create: { tenantId, year, ...data }, update: data });
      for (const c of credits) {
        await tx.taxCredit.create({ data: { tenantId, taxReturnId: taxReturn.id, section: c.section, code: c.code, referenceYear: year, amount: c.amount, description: c.description } });
      }
      // The previous year's credits are in LM43 and their F24 uses in LM44: the rest lowers LM46 (or raises LM47), so it
      // can no longer be compensated. The same credits the guide reads for LM43.
      await tx.taxCredit.updateMany({
        where: { tenantId, section: 'TREASURY', code: incomeRules.taxCodes.substituteTaxBalance, referenceYear: year - 1, absorbedByReturnId: null },
        data: { absorbedByReturnId: taxReturn.id },
      });
    });
    return (await this.get(tenantId, year))!;
  }

  /** Back to not filed: allowed while no F24 uses the credits it registered. The previous year's credits it absorbed reopen (ON DELETE SET NULL). */
  async unmark(tenantId: string, year: number): Promise<void> {
    const filed = await this.prisma.taxReturn.findUnique({ where: { tenantId_year: { tenantId, year } }, include: { credits: { include: { usages: { select: { id: true } } } } } });
    if (!filed) throw new NotFoundException(`La dichiarazione dei redditi ${year} non è segnata come presentata`);
    if (filed.credits.some((c) => c.usages.length > 0)) throw new ConflictException('Un credito di questa dichiarazione è già usato in un F24: elimina prima quel piano');
    await this.prisma.$transaction([
      this.prisma.taxCredit.deleteMany({ where: { tenantId, taxReturnId: filed.id } }),
      this.prisma.taxReturn.delete({ where: { id: filed.id } }),
    ]);
  }
}
