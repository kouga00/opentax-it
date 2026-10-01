import { Global, Module } from '@nestjs/common';
import { AuthGuard } from '../common/auth.guard.js';
import { RolesGuard } from '../common/roles.guard.js';
import { AuthController } from './controllers/auth.controller.js';
import { AuthService } from './services/auth.service.js';
import { PasswordService } from './services/password.service.js';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    AuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    PasswordService,
    AuthGuard,
    RolesGuard,
  ],
})
export class AuthModule {}
