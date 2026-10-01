import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';
import { CurrentUser } from '../../common/current-user.decorator.js';
import { OptionalTenantId } from '../../common/optional-tenant.decorator.js';
import { Public } from '../../common/public.decorator.js';
import { SessionToken } from '../../common/session-token.decorator.js';
import { LoginDto } from '../dto/request/login.dto.js';
import { RegisterDto } from '../dto/request/register.dto.js';
import { SelectTenantDto } from '../dto/request/select-tenant.dto.js';
import { AuthResponseDto } from '../dto/response/auth-response.dto.js';
import { UserResponseDto } from '../dto/response/user-response.dto.js';
import { AuthService } from '../services/auth.service.js';
import type { UserWithMemberships } from '../types/user-with-memberships.js';

@ApiTags('auth')
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({
    default: { limit: 5, ttl: 15 * 60_000 },
    'auth-email': { limit: 20, ttl: 60 * 60_000 },
  })
  @Post('register')
  @ApiOperation({ summary: 'Registrazione nuovo utente' })
  @ApiCreatedResponse({ type: AuthResponseDto, description: 'Utente registrato e sessione creata con successo' })
  @ApiConflictResponse({ description: 'Registrazione non riuscita' })
  register(@Body() dto: RegisterDto, @Req() req: Request): Promise<AuthResponseDto> {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.header('user-agent');
    return this.authService.register(dto, ip, userAgent);
  }

  @Public()
  @Throttle({
    default: { limit: 5, ttl: 15 * 60_000 },
    'auth-email': { limit: 20, ttl: 60 * 60_000 },
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accesso utente' })
  @ApiOkResponse({ type: AuthResponseDto, description: 'Accesso effettuato con successo' })
  @ApiUnauthorizedResponse({ description: 'Credenziali non valide' })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.header('user-agent');
    return this.authService.login(dto, ip, userAgent);
  }

  @SkipThrottle()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnessione utente e chiusura sessione' })
  @ApiNoContentResponse({ description: 'Sessione revocata con successo' })
  async logout(@SessionToken() token?: string): Promise<void> {
    if (token) {
      await this.authService.logout(token);
    }
  }

  @SkipThrottle()
  @Get('me')
  @ApiOperation({ summary: 'Dati dell\'utente autenticato e tenant attivo' })
  @ApiOkResponse({ type: UserResponseDto, description: 'Dati dell\'utente corrente' })
  me(
    @CurrentUser() user: UserWithMemberships,
    @OptionalTenantId() activeTenantId?: string | null,
  ): Promise<UserResponseDto> {
    return this.authService.getMe(user.id, activeTenantId);
  }

  @SkipThrottle()
  @Post('select-tenant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seleziona la partita IVA attiva per la sessione' })
  @ApiOkResponse({ type: UserResponseDto, description: 'Partita IVA selezionata con successo' })
  selectTenant(
    @CurrentUser() user: UserWithMemberships,
    @SessionToken() token: string,
    @Body() dto: SelectTenantDto,
  ): Promise<UserResponseDto> {
    return this.authService.selectTenant(user.id, token, dto.tenantId);
  }
}
