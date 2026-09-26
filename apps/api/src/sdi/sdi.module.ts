import { Module } from '@nestjs/common';
import { PecSettingsController } from './controllers/pec-settings.controller.js';
import { SdiTransmissionsController } from './controllers/sdi-transmissions.controller.js';
import { PecMailerService } from './services/pec-mailer.service.js';
import { PecSettingsService } from './services/pec-settings.service.js';
import { SdiTransmissionsService } from './services/sdi-transmissions.service.js';

@Module({ controllers: [PecSettingsController, SdiTransmissionsController], providers: [PecSettingsService, PecMailerService, SdiTransmissionsService] })
export class SdiModule {}
