import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/current-user.decorator.js';
import { Public } from '../common/public.decorator.js';
import { SessionToken } from '../common/session-token.decorator.js';
import type { UserWithMemberships } from '../auth/types/user-with-memberships.js';
import { TenantId } from '../common/tenant.decorator.js';
import { BankAccountDto, CreateTenantDto, PaymentTermsDto, UpdateTenantProfileDto } from './tenants.dto.js';
import { TenantsService } from './tenants.service.js';

@ApiTags('Partite IVA')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  @ApiOperation({ summary: 'Crea una partita IVA con il suo profilo fiscale' })
  @Post()
  create(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user?: UserWithMemberships,
    @SessionToken() token?: string,
  ) {
    return this.service.create(dto, user?.id, token);
  }

  @ApiOperation({ summary: 'Elenco delle partite IVA' })
  @Get()
  list(@CurrentUser() user?: UserWithMemberships) {
    return this.service.list(user?.id, user?.role);
  }

  @ApiOperation({ summary: 'Conti bancari' })
  @Get('me/bank-accounts')
  bankAccounts(@TenantId() tenantId: string) { return this.service.listBankAccounts(tenantId); }

  @ApiOperation({ summary: 'Aggiunge un conto bancario' })
  @Post('me/bank-accounts')
  createBankAccount(@TenantId() tenantId: string, @Body() dto: BankAccountDto) { return this.service.saveBankAccount(tenantId, dto); }

  @ApiOperation({ summary: 'Sostituisce un conto bancario' })
  @Put('me/bank-accounts/:id')
  updateBankAccount(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: BankAccountDto) { return this.service.saveBankAccount(tenantId, dto, id); }

  @ApiOperation({ summary: 'Elimina un conto bancario' })
  @Delete('me/bank-accounts/:id') @HttpCode(204)
  deleteBankAccount(@TenantId() tenantId: string, @Param('id') id: string) { return this.service.deleteBankAccount(tenantId, id); }

  @ApiOperation({ summary: 'Profili di scadenza' })
  @Get('me/payment-terms')
  paymentTerms(@TenantId() tenantId: string) { return this.service.listPaymentTerms(tenantId); }

  @ApiOperation({ summary: 'Aggiunge un profilo di scadenza' })
  @Post('me/payment-terms')
  createPaymentTerms(@TenantId() tenantId: string, @Body() dto: PaymentTermsDto) { return this.service.savePaymentTerms(tenantId, dto); }

  @ApiOperation({ summary: 'Sostituisce un profilo di scadenza' })
  @Put('me/payment-terms/:id')
  updatePaymentTerms(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: PaymentTermsDto) { return this.service.savePaymentTerms(tenantId, dto, id); }

  @ApiOperation({ summary: 'Elimina un profilo di scadenza' })
  @Delete('me/payment-terms/:id') @HttpCode(204)
  deletePaymentTerms(@TenantId() tenantId: string, @Param('id') id: string) { return this.service.deletePaymentTerms(tenantId, id); }

  @ApiOperation({ summary: 'Sedi INPS' })
  @Public()
  @Get('inps-offices')
  inpsOffices() {
    return this.service.inpsOffices();
  }

  @ApiOperation({ summary: 'Casse professionali (codici TipoCassa della FatturaPA)' })
  @Public()
  @Get('professional-funds')
  professionalFunds() {
    return this.service.professionalFunds();
  }

  @ApiOperation({ summary: 'Profilo fiscale della partita IVA' })
  @Get('me')
  me(@TenantId() tenantId: string) {
    return this.service.getWithProfile(tenantId);
  }

  @ApiOperation({ summary: 'Aggiorna il profilo fiscale' })
  @Put('me')
  updateMe(@TenantId() tenantId: string, @Body() dto: UpdateTenantProfileDto) {
    return this.service.updateProfile(tenantId, dto);
  }
}
