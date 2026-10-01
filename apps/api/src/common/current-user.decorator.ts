import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UserWithMemberships } from '../auth/types/user-with-memberships.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserWithMemberships | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return (req as unknown as { user?: UserWithMemberships }).user;
  },
);
