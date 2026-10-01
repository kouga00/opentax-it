import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/public.decorator.js';
import { AppService } from './app.service.js';

@ApiTags('Stato')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Verifica che l\'API risponda' })
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
