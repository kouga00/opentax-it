import { NextResponse, type NextRequest } from 'next/server';

/**
 * Rejects requests whose Host header is not in ALLOWED_HOSTS (comma-separated host names,
 * default localhost only), against DNS rebinding: see apps/api/src/common/host-allowlist.ts.
 */
const allowed = new Set((process.env.ALLOWED_HOSTS ?? 'localhost,127.0.0.1,::1').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean));

function hostName(host: string | null): string {
  if (!host) return '';
  const h = host.trim().toLowerCase();
  if (h.startsWith('[')) return h.slice(1, h.indexOf(']'));
  return h.split(':')[0];
}

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/invoices',
  '/customers',
  '/deadlines',
  '/taxes',
  '/f24',
  '/credits',
  '/banks',
  '/payment-terms',
  '/setup',
];

export function proxy(request: NextRequest) {
  if (!allowed.has(hostName(request.headers.get('host')))) {
    return new NextResponse('Host not allowed', { status: 421 });
  }

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const hasSession = Boolean(request.cookies.get('opentax_session')?.value);


  if (isProtected && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
