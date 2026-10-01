import type { ReturnRow } from '@opentax-it/fiscal-rules';
import type { RevenueDifference } from './revenue-difference.js';

/** What the taxpayer needs to fill the LM form of the pre-filled Redditi PF (taxes/services/return-guide.service.ts). */
export interface ReturnGuide {
  year: number;
  /** The forms of the return, in order: LM (substitute tax), RR (contributions of the scheme), RX (result). */
  forms: Array<{ id: 'LM' | 'RR' | 'RX'; rows: ReturnRow[] }>;
  revenue: {
    /** Revenue of the invoices issued in the year: what the pre-filled return proposes in LM22 col. 3, by issue date. */
    issuedInYear: number;
    /** Revenue collected in the year (cash basis): LM22 col. 3. */
    collectedInYear: number;
    /** Invoices of the year not collected in the year (in whole or in part): to take out of the proposed amount. */
    notCollectedInYear: RevenueDifference[];
    /** Invoices of other years collected in the year: to add to the proposed amount. */
    collectedFromOtherYears: RevenueDifference[];
  };
  warnings: string[];
}
