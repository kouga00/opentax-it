import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UserRole } from '../generated/prisma/enums.js';
import type { UserWithMemberships } from './auth.mapper.js';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const user = (req as unknown as { user?: UserWithMemberships }).user;

    if (!user) {
      throw new UnauthorizedException('Autenticazione richiesta');
    }

    if (!requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('Permessi insufficienti per accedere a questa risorsa');
    }

    return true;
  }
}
