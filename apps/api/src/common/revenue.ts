/**
 * Revenue of a flat-rate taxpayer, on the cash basis (L. 190/2014 art. 1 par. 64): what is collected in the year,
 * except the professional fund contribution charged on the invoice. For those enrolled in a fund "i contributi
 * addebitati al committente in fattura sono esclusi dall'importo dei componenti positivi di reddito" (AdE,
 * precompilata "Quadro LM"); Redditi PF 2026 booklet 3 asks for the compensation "al netto dei contributi
 * previdenziali o assistenziali posti dalla legge a carico del soggetto che li corrisponde". The 4% INPS surcharge,
 * instead, is revenue. A partial collection is split in proportion to the invoice total: a project choice, no source
 * says how to split it.
 */

/** Invoice fields that `revenueShare` needs, as a Prisma select. */
export const REVENUE_INVOICE_SELECT = { total: true, professionalFundContribution: true } as const;

/** Part of a collected amount that is revenue. */
export function revenueShare(amount: number, invoice: { total: unknown; professionalFundContribution: unknown }): number {
  const total = Number(invoice.total);
  const fund = Number(invoice.professionalFundContribution);
  if (fund === 0 || total === 0) return amount;
  return (amount * (total - fund)) / total;
}
