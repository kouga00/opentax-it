/**
 * Parses TRUST_PROXY configuration value for Express.
 * Express's trust proxy accepts:
 * - boolean: true (trust all hops) / false (trust none)
 * - number: trust the nth hop from front-facing proxy (e.g. 1)
 * - string: comma-separated list of IP addresses or subnets (or pre-defined names like 'loopback', 'linklocal', 'uniquelocal')
 *
 * Environment variables are strings. If "1" or "true" is passed as a string,
 * Express treats it as an IP address list and fails compilation.
 * See: https://expressjs.com/en/guide/behind-proxies.html
 */
export function parseTrustProxy(value: string | undefined): boolean | number | string {
  if (!value || !value.trim()) return 'loopback';
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'true') return true;
  if (lower === 'false') return false;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}
