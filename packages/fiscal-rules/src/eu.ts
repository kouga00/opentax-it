/**
 * EU member states for classifying foreign customers (services, art. 7-ter DPR 633/72).
 *
 * - The 27 member states: European Union, "Paesi dell'UE"
 *   (https://european-union.europa.eu/principles-countries-history/eu-countries_it, checked 2026-09-23).
 *   Greece appears as GR (ISO 3166) and EL (prefix of its VAT numbers); Italy is excluded because
 *   Italian customers are not foreign.
 * - United Kingdom (GB): third country for VAT from 1/1/2021 (AdE, FAQ "Info Brexit").
 * - Northern Ireland (XI): EU VAT rules keep applying only to "cessioni, acquisti intracomunitari ed
 *   importazioni di beni" (ADM, notice on the Determination of 15/02/2021): for services it is outside
 *   the EU, so XI is deliberately not in this list.
 */
export const EU_MEMBER_STATES: ReadonlySet<string> = new Set([
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'GR', 'ES', 'FI', 'FR', 'HR',
  'HU', 'IE', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
]);

/** Whether a foreign customer's country is an EU member state (for services: XI and GB are not). */
export function isEuMemberState(countryCode: string): boolean {
  return EU_MEMBER_STATES.has(countryCode.toUpperCase());
}
