import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Tenant ID from the authenticated session when present.
 * Client-supplied headers like `x-tenant-id` are strictly ignored.
 */
export const OptionalTenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string | undefined => {
  const req = ctx.switchToHttp().getRequest<Request>();
  return (req as unknown as { tenantId?: string | null }).tenantId ?? undefined;
});
