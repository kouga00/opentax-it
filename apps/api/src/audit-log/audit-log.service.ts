import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AuditLogEntry {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  data?: Record<string, unknown> | null;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogEntry, client?: Prisma.TransactionClient): Promise<void> {
    const data = {
      tenantId: entry.tenantId ?? null,
      userId: entry.userId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      data: entry.data ? (entry.data as Prisma.InputJsonValue) : Prisma.DbNull,
    };

    if (client) {
      // Within a transaction, do not suppress errors: in PostgreSQL, an ignored error
      // aborts the transaction and turns the final COMMIT into a silent rollback.
      await client.auditLog.create({ data });
      return;
    }

    try {
      await this.prisma.auditLog.create({ data });
    } catch (err) {
      // Standalone audit log errors should not crash the main operation, but must be logged
      this.logger.error(`Failed to write audit log: ${entry.action}`, err);
    }
  }
}
