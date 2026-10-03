import type { Prisma } from '../../generated/prisma/client.js';

/** A credit with its uses in F24 forms, how much of it was used and how much is left (nothing once a return absorbed it). */
export type TaxCreditBalance = Prisma.TaxCreditGetPayload<{
  include: {
    usages: { include: { f24Line: { include: { f24: { select: { id: true; paymentDate: true; status: true } } } } } };
    absorbedByReturn: { select: { year: true } };
  };
}> & { used: number; remaining: number };
