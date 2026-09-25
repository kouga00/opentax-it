import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { SessionToken } from '../auth/session-token.decorator.js';
import type { UserWithMemberships } from '../auth/auth.mapper.js';
import { TenantId } from '../common/tenant.decorator.js';
import { BankAccountDto, CreateTenantDto, PaymentTermsDto, UpdateTenantProfileDto } from './tenants.dto.js';
import { TenantsService } from './tenants.service.js';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  @Post()
  create(
    @Body() dto: CreateTenantDto,
    @CurrentUser() user?: UserWithMemberships,
    @SessionToken() token?: string,
  ) {
    return this.service.create(dto, user?.id, token);
  }

  @Get()
  list(@CurrentUser() user?: UserWithMemberships) {
    return this.service.list(user?.id, user?.role);
  }

  @Get('me/bank-accounts')
  bankAccounts(@TenantId() tenantId: string) { return this.service.listBankAccounts(tenantId); }

  @Post('me/bank-accounts')
  createBankAccount(@TenantId() tenantId: string, @Body() dto: BankAccountDto) { return this.service.saveBankAccount(tenantId, dto); }

  @Put('me/bank-accounts/:id')
  updateBankAccount(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: BankAccountDto) { return this.service.saveBankAccount(tenantId, dto, id); }

  @Delete('me/bank-accounts/:id') @HttpCode(204)
  deleteBankAccount(@TenantId() tenantId: string, @Param('id') id: string) { return this.service.deleteBankAccount(tenantId, id); }

  @Get('me/payment-terms')
  paymentTerms(@TenantId() tenantId: string) { return this.service.listPaymentTerms(tenantId); }

  @Post('me/payment-terms')
  createPaymentTerms(@TenantId() tenantId: string, @Body() dto: PaymentTermsDto) { return this.service.savePaymentTerms(tenantId, dto); }

  @Put('me/payment-terms/:id')
  updatePaymentTerms(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: PaymentTermsDto) { return this.service.savePaymentTerms(tenantId, dto, id); }

  @Delete('me/payment-terms/:id') @HttpCode(204)
  deletePaymentTerms(@TenantId() tenantId: string, @Param('id') id: string) { return this.service.deletePaymentTerms(tenantId, id); }

  @Public()
  @Get('inps-offices')
  inpsOffices() {
    return this.service.inpsOffices();
  }

  @Get('me')
  me(@TenantId() tenantId: string) {
    return this.service.getWithProfile(tenantId);
  }

  @Put('me')
  updateMe(@TenantId() tenantId: string, @Body() dto: UpdateTenantProfileDto) {
    return this.service.updateProfile(tenantId, dto);
  }
}
