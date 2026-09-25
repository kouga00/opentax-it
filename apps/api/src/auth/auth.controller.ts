import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { LoginDto } from './dto/request/login.dto.js';
import { RegisterDto } from './dto/request/register.dto.js';
import { SelectTenantDto } from './dto/request/select-tenant.dto.js';
import { AuthResponseDto } from './dto/response/auth-response.dto.js';
import { UserResponseDto } from './dto/response/user-response.dto.js';
import { Public } from './public.decorator.js';
import { SessionToken } from './session-token.decorator.js';
import type { UserWithMemberships } from './auth.mapper.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({
    default: { limit: 5, ttl: 15 * 60_000 },
    'auth-email': { limit: 5, ttl: 15 * 60_000 },
  })
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request): Promise<AuthResponseDto> {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.header('user-agent');
    return this.authService.register(dto, ip, userAgent);
  }

  @Public()
  @Throttle({
    default: { limit: 5, ttl: 15 * 60_000 },
    'auth-email': { limit: 5, ttl: 15 * 60_000 },
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.header('user-agent');
    return this.authService.login(dto, ip, userAgent);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@SessionToken() token?: string): Promise<void> {
    if (token) {
      await this.authService.logout(token);
    }
  }

  @Get('me')
  me(
    @CurrentUser() user: UserWithMemberships,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    const tenantId = (req as unknown as { tenantId?: string | null }).tenantId;
    return this.authService.getMe(user.id, tenantId);
  }

  @Post('select-tenant')
  @HttpCode(HttpStatus.OK)
  selectTenant(
    @CurrentUser() user: UserWithMemberships,
    @SessionToken() token: string,
    @Body() dto: SelectTenantDto,
  ): Promise<UserResponseDto> {
    return this.authService.selectTenant(user.id, token, dto.tenantId);
  }
}
