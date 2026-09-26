import { Module } from '@nestjs/common';
import { CustomersController } from './controllers/customers.controller.js';
import { CustomersService } from './services/customers.service.js';

@Module({ controllers: [CustomersController], providers: [CustomersService], exports: [CustomersService] })
export class CustomersModule {}
