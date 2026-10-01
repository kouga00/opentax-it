import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { checkContributionRow, contributionScheme, findInpsOfficeById, nextBusinessDay, parseIsoDate, selfEmployedReasons, toIsoDate } from '@opentax-it/fiscal-rules';
import { FiscalRulesService } from '../../fiscal-rules/fiscal-rules.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TenantsService } from '../../tenants/tenants.service.js';
import type { CreateContributionF24Dto } from '../dto/request/create-contribution-f24.dto.js';
import type { SavedF24 } from '../types/saved-f24.js';

/** Rows the official model has per section (MOD. F24 – 2013: four INPS rows, two in the "Altri enti" second box). */
const ROWS_PER_FORM = { INPS: 4, OTHER_ENTITY: 2 } as const;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * F24 forms of contributions entered by the taxpayer, as the entity communicates them (INPS Artigiani and Commercianti,
 * professional funds): each row is checked against the rules of its section and entity (packages/fiscal-rules,
 * contribution-rows.ts). Kept apart from the installment plans of the tax return (F24Service): a plan can be recreated
 * without touching these forms.
 */
@Injectable()
export class ContributionF24Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rules: FiscalRulesService,
    private readonly tenants: TenantsService,
  ) {}

  /**
   * INPS Artigiani and Commercianti: one form for each of the four installments of the contribution on the minimum
   * income of `year` (AF/CF, period January-December of the year, the INPS code of each installment as the INPS
   * communicates it), at the dates of the INPS circular moved to the next business day.
   */
  async createFixedInstallments(tenantId: string, year: number): Promise<SavedF24[]> {
    const [{ profile }, rules, data] = await Promise.all([
      this.tenants.getWithProfile(tenantId),
      this.rules.getActive(year),
      this.prisma.taxYearData.findUnique({ where: { tenantId_year: { tenantId, year } }, select: { inpsFixedCodes: true } }),
    ]);
    const scheme = contributionScheme(profile.socialSecurityScheme, rules);
    const kind = profile.socialSecurityScheme === 'INPS_ARTISANS' ? 'ARTISANS' : 'TRADERS';
    if (!scheme?.fixed) throw new BadRequestException(`Le rate fisse sul minimale sono solo di Artigiani e Commercianti, con un set di regole ${year} che ne contenga i dati`);
    const office = profile.inpsOfficeId ? findInpsOfficeById(profile.inpsOfficeId) : undefined;
    if (!office) throw new BadRequestException('Indica la sede INPS nel profilo');
    const codes = data?.inpsFixedCodes ?? [];
    if (codes.length < 4 || codes.some((c) => !c)) throw new BadRequestException(`Indica in Imposte ${year} i codici INPS delle quattro rate (17 cifre, cassetto previdenziale "Dati del mod. F24")`);
    const reason = selfEmployedReasons(rules, kind).fixed;
    const existing = await this.prisma.f24Line.count({ where: { f24: { tenantId, status: { not: 'CANCELLED' } }, section: 'INPS', code: reason, referenceYear: year } });
    if (existing > 0) throw new ConflictException(`Le rate fisse ${year} sono già state create: eliminale prima di ricrearle`);
    const fixed = scheme.fixed(rules, { ratePct: 0, nextYearRatePct: 0, flatRateReduction: profile.inpsFlatRateReduction, seniorityBefore1996: profile.inpsSeniorityBefore1996 });
    const forms: SavedF24[] = [];
    for (const [i, installment] of fixed.installments.entries()) {
      forms.push(await this.create(tenantId, {
        paymentDate: toIsoDate(nextBusinessDay(parseIsoDate(installment.date))),
        lines: [{ section: 'INPS', officeCode: office.code, reason, positionCode: codes[i], periodFrom: `01/${year}`, periodTo: `12/${year}`, amount: installment.amount }],
      }));
    }
    return forms;
  }

  async create(tenantId: string, dto: CreateContributionF24Dto): Promise<SavedF24> {
    const rows = dto.lines.map((line) => ({ line, check: checkContributionRow(line) }));
    const errors = rows.flatMap(({ check }, i) => check.errors.map((e) => `Riga ${i + 1}: ${e}`));
    if (errors.length) throw new BadRequestException(errors.join('; '));
    for (const [section, max] of Object.entries(ROWS_PER_FORM)) {
      const count = dto.lines.filter((l) => l.section === section).length;
      if (count > max) throw new BadRequestException(`Il modello F24 ha ${max} righe per questa sezione: crea un secondo modello per le altre ${count - max}`);
    }
    // The model prints the entity code once, on the first row of the "Altri enti" box: one entity per form.
    const entities = new Set(dto.lines.filter((l) => l.section === 'OTHER_ENTITY').map((l) => l.entityCode));
    if (entities.size > 1) throw new BadRequestException('Nella sezione "Altri enti previdenziali" del modello F24 c\'è un solo codice ente: crea un modello per ogni ente');
    const paymentDate = parseIsoDate(dto.paymentDate);
    const totalDebit = round2(dto.lines.reduce((s, l) => s + l.amount, 0));
    return this.prisma.f24.create({
      data: {
        tenantId,
        kind: 'OTHER',
        paymentDate,
        totalDebit,
        balance: totalDebit,
        lines: {
          create: rows.map(({ line, check }) => ({
            section: line.section,
            role: 'CONTRIBUTION' as const,
            code: line.reason,
            entityCode: line.entityCode ?? null,
            officeCode: line.officeCode ?? null,
            positionCode: line.positionCode ?? null,
            periodFrom: line.periodFrom ?? null,
            periodTo: line.periodTo ?? null,
            referenceYear: Number((line.periodFrom ?? dto.paymentDate).slice(-4)),
            debitAmount: line.amount,
            deductibleAmount: round2(check.deductibleAmount),
            description: check.description,
          })),
        },
      },
      include: { lines: true, plan: { select: { taxYear: true, installments: true } } },
    });
  }

  /**
   * Deletes a form outside the plans not yet paid (contributions, stamp duty: the quarter keeps the amount of the AdE
   * and loses the link); forms of an installment plan are deleted with the plan.
   */
  async remove(tenantId: string, id: string): Promise<void> {
    const f24 = await this.prisma.f24.findFirst({ where: { id, tenantId }, select: { planId: true, status: true, kind: true } });
    if (!f24) throw new NotFoundException('F24 non trovato');
    if (f24.planId || (f24.kind !== 'OTHER' && f24.kind !== 'STAMP_DUTY')) throw new ConflictException('Questo modello fa parte di un piano di versamento: si elimina con il piano.');
    // Same rule as a plan (f24.service.ts): a paid form stays.
    if (f24.status === 'PAID') throw new ConflictException('Un modello pagato non si elimina: annulla prima il pagamento se è un errore.');
    await this.prisma.f24.delete({ where: { id } });
  }
}
