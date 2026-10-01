import { HttpException, type Logger } from '@nestjs/common';

/**
 * Message for the user when a document of an upload fails: our own validation messages (HttpException) as they are,
 * anything else (database, file system, parser) replaced by `unexpected` and logged. Shared by the import handlers.
 */
export function importErrorMessage(logger: Logger, file: string, err: unknown, unexpected: string): string {
  if (err instanceof HttpException) return err.message;
  logger.error(`Import of ${file} failed`, err as Error);
  return unexpected;
}
