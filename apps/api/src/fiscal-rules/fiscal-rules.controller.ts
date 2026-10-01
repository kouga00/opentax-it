import { Controller, Get, HttpException, Param, ParseBoolPipe, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/public.decorator.js';
import { Roles } from '../common/roles.decorator.js';
import { OptionalTenantId } from '../common/optional-tenant.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import { FiscalRulesService } from './fiscal-rules.service.js';

@ApiTags('Regole fiscali')
@Controller('fiscal-rules')
export class FiscalRulesController {
  constructor(private readonly service: FiscalRulesService) {}

  /** Content of one stored set, with the source of each value and the changes from the active set. */
  @ApiOperation({ summary: 'Contenuto di un set di regole, con la fonte di ogni valore e le differenze dal set attivo' })
  @Public()
  @Get('sets/:id')
  describe(@Param('id') id: string) {
    return this.service.describe(id);
  }

  @ApiOperation({ summary: 'Set di regole di un anno' })
  @Public()
  @Get(':year')
  list(@Param('year', ParseIntPipe) year: number) {
    return this.service.listByYear(year);
  }

  @ApiOperation({ summary: 'Set di regole attivo per un anno' })
  @Public()
  @Get(':year/active')
  active(@Param('year', ParseIntPipe) year: number) {
    return this.service.getActive(year);
  }

  /** Deadline calendar; with an active tenant selected the stamp duty deferrals use the tenant's invoices. */
  @ApiOperation({ summary: 'Scadenze fiscali dell\'anno' })
  @Public()
  @Get(':year/deadlines')
  deadlines(
    @Param('year', ParseIntPipe) year: number,
    @OptionalTenantId() tenantId: string | undefined,
    @Query('extension', new ParseBoolPipe({ optional: true })) extension?: boolean,
    @Query('intrastat', new ParseBoolPipe({ optional: true })) intrastat?: boolean,
  ) {
    return this.service.deadlines(year, { applyExtension: extension ?? true, quarterlyIntrastat: intrastat }, tenantId);
  }

  @ApiOperation({ summary: 'Attiva un set di regole' })
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  @ApiOperation({ summary: 'Carica i set di regole forniti con il codice, come bozze' })
  @Roles(UserRole.PLATFORM_ADMIN)
  @Post('seed')
  seed() {
    return this.service.seedBundled().then((inserted) => ({ inserted }));
  }

  /** Whether the active set for a year is usable; lets the UI explain what to do instead of failing. */
  @ApiOperation({ summary: 'Se il set attivo dell\'anno è utilizzabile' })
  @Public()
  @Get(':year/status')
  async status(@Param('year', ParseIntPipe) year: number) {
    try {
      await this.service.getActive(year);
      return { year, ok: true };
    } catch (e) {
      if (!(e instanceof HttpException)) throw e; // unexpected errors stay generic 500s
      return { year, ok: false, reason: e.message };
    }
  }
}
