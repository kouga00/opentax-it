import type { PecProviderReceipt } from './pec-provider-receipt.js';
import type { SdiPlainMessage } from './sdi-plain-message.js';
import type { SdiReceiptMessage } from './sdi-receipt-message.js';

/** What a message of the PEC mailbox is, for the SDI transmissions: everything else is "other" and is not kept. */
export type PecInbound = PecProviderReceipt | SdiReceiptMessage | SdiPlainMessage | { kind: 'other' };
