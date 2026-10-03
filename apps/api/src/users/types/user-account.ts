import type { Prisma } from '../../generated/prisma/client.js';

/** A user with the VAT numbers it can access, as the platform admin manages it. */
export type UserAccount = Prisma.UserGetPayload<{ include: { memberships: { include: { tenant: { select: { id: true; name: true } } } } } }>;
