import type { Prisma } from '../../generated/prisma/client.js';

/** A saved F24 form with its lines and, when it belongs to one, its installment plan. */
export type SavedF24 = Prisma.F24GetPayload<{ include: { lines: true; plan: { select: { taxYear: true; installments: true } } } }>;
