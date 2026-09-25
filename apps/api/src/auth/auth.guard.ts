import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

function extractToken(req: Request): string | null {
  const authHeader = req.header('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  const customHeader = req.header('x-session-token');
  if (customHeader) {
    return customHeader.trim();
  }

  const cookieHeader = req.header('cookie');
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)opentax_session=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest<Request>();
    const token = extractToken(req);

    if (!token) {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException('Autenticazione richiesta');
    }

    const sessionData = await this.authService.validateSession(token);
    if (!sessionData) {
      if (isPublic) {
        return true;
      }
      throw new UnauthorizedException('Sessione non valida o scaduta');
    }

    // Attach to request for downstream handlers and decorators
    const reqWithAuth = req as unknown as {
      user?: typeof sessionData.user;
      session?: typeof sessionData.session;
      tenantId?: string | null;
      sessionToken?: string;
    };

    reqWithAuth.user = sessionData.user;
    reqWithAuth.session = sessionData.session;
    reqWithAuth.tenantId = sessionData.session.activeTenantId;
    reqWithAuth.sessionToken = token;

    return true;
  }
}
