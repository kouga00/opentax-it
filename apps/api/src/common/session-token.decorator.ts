import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const SessionToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return (req as unknown as { sessionToken?: string }).sessionToken;
  },
);
