import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { TenantId } from '../../common/tenant.decorator.js';
import { SaveCustomerDto } from '../dto/request/save-customer.dto.js';
import { CustomersService } from '../services/customers.service.js';

@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get() list(@TenantId() tenantId: string) { return this.service.list(tenantId); }
  @Get(':id') get(@TenantId() tenantId: string, @Param('id') id: string) { return this.service.get(tenantId, id); }
  @Post() create(@TenantId() tenantId: string, @Body() dto: SaveCustomerDto) { return this.service.create(tenantId, dto); }
  @Put(':id') update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: SaveCustomerDto) { return this.service.update(tenantId, id, dto); }
  @Delete(':id') @HttpCode(204) remove(@TenantId() tenantId: string, @Param('id') id: string) { return this.service.remove(tenantId, id); }
}
