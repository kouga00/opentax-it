import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../../common/tenant.decorator.js';
import { SaveCustomerDto } from '../dto/request/save-customer.dto.js';
import { CustomersService } from '../services/customers.service.js';

@ApiTags('Clienti')
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @ApiOperation({ summary: 'Elenco dei clienti' })
  @Get() list(@TenantId() tenantId: string) { return this.service.list(tenantId); }
  @ApiOperation({ summary: 'Un cliente' })
  @Get(':id') get(@TenantId() tenantId: string, @Param('id') id: string) { return this.service.get(tenantId, id); }
  @ApiOperation({ summary: 'Crea un cliente' })
  @Post() create(@TenantId() tenantId: string, @Body() dto: SaveCustomerDto) { return this.service.create(tenantId, dto); }
  @ApiOperation({ summary: 'Sostituisce i dati di un cliente' })
  @Put(':id') update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: SaveCustomerDto) { return this.service.update(tenantId, id, dto); }
  @ApiOperation({ summary: 'Elimina un cliente' })
  @Delete(':id') @HttpCode(204) remove(@TenantId() tenantId: string, @Param('id') id: string) { return this.service.remove(tenantId, id); }
}
