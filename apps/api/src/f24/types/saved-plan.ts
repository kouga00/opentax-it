import type { Prisma } from '../../generated/prisma/client.js';

/** A saved installment plan with its forms and their lines. */
export type SavedPlan = Prisma.InstallmentPlanGetPayload<{ include: { f24s: { include: { lines: true } } } }>;
