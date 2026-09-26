/** Which debts the credits cover first (the taxpayer's choice). */
export const COMPENSATION_ORDERS = ['INPS_FIRST', 'TAX_FIRST'] as const;

export type CompensationOrder = (typeof COMPENSATION_ORDERS)[number];
