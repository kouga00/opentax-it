/**
 * Rounding shared by the tax and contribution modules.
 *
 * Source: Redditi PF 2026 instructions, booklet 1, "Modalità di arrotondamento": "Tutti gli importi
 * indicati nella dichiarazione devono essere arrotondati all'unità di euro, per eccesso se la frazione
 * decimale è uguale o superiore a cinquanta centesimi"; §7: amounts elaborated afterwards (installments)
 * are rounded to the cent.
 */

/** Rounds to the euro unit as in the tax return (≥ 50 cents up). */
export const roundEuro = (n: number) => Math.round(n + Number.EPSILON);

/** Rounds to the cent (advances, installments). */
export const roundCents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
