import { BadRequestException, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Tenant identification. Resolved exclusively from the authenticated session (activeTenantId).
 * Request headers like `x-tenant-id` are strictly ignored to ensure tenant isolation.
 */
export const TenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<Request>();
  const id = (req as unknown as { tenantId?: string | null }).tenantId;
  if (!id) throw new BadRequestException('Nessuna partita IVA attiva selezionata');
  return id;
});
