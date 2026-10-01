import type { NextFunction, Request, Response } from 'express';

/**
 * Rejects requests whose Host header is not in ALLOWED_HOSTS (comma-separated host names,
 * default localhost only). Without this check a malicious web page can use DNS rebinding to
 * make the browser call the API on 127.0.0.1 as a same-origin request, bypassing CORS.
 */
export function allowedHosts(): Set<string> {
  const list = process.env.ALLOWED_HOSTS ?? 'localhost,127.0.0.1,::1';
  return new Set(list.split(',').map((h) => h.trim().toLowerCase()).filter(Boolean));
}

/** Host name without port; IPv6 literals lose their brackets ("[::1]:3000" → "::1"). */
export function hostName(host: string | undefined): string {
  if (!host) return '';
  const h = host.trim().toLowerCase();
  if (h.startsWith('[')) return h.slice(1, h.indexOf(']'));
  return h.split(':')[0];
}

export function hostAllowlist(hosts = allowedHosts()) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (hosts.has(hostName(req.headers.host))) return next();
    res.status(421).json({ statusCode: 421, message: 'Host not allowed' });
  };
}
