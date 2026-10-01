import type { PecSettings } from './types';

/** The PEC mailbox can send: address and password saved. */
export const pecReady = (pec: Pick<PecSettings, 'address' | 'hasPassword'> | null | undefined): boolean => Boolean(pec?.address && pec.hasPassword);
