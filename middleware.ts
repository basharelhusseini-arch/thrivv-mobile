import { NextResponse, type NextRequest } from 'next/server';

/**
 * Hostname-based routing split.
 *
 * Production:
 *   - thrivv.dev (and www.thrivv.dev)  → consumer member app
 *   - gyms.thrivv.dev                  → gym owner / admin app
 *
 * The two surfaces share the same Next.js deployment, the same
 * Supabase project, and (when COOKIE_DOMAIN is set, see lib/auth.ts)
 * the same auth cookie so logging in on one works on the other.
 *
 * Anything else (localhost, *.vercel.app preview URLs, custom dev
 * domains) is treated as un-split: every route is reachable from
 * any host. This keeps local dev and preview deploys untouched.
 *
 * Override the hostnames per-environment with:
 *   NEXT_PUBLIC_APP_HOSTNAME=thrivv.dev
 *   NEXT_PUBLIC_GYM_HOSTNAME=gyms.thrivv.dev
 */

const APP_HOSTNAME =
  process.env.NEXT_PUBLIC_APP_HOSTNAME?.toLowerCase() || 'thrivv.dev';
const GYM_HOSTNAME =
  process.env.NEXT_PUBLIC_GYM_HOSTNAME?.toLowerCase() || 'gyms.thrivv.dev';

/** Auth + signup pages and auth API are usable from either hostname. */
function isShared(pathname: string): boolean {
  return (
    pathname === '/api/gym/invitations/accept' ||
    pathname === '/member/login' ||
    pathname === '/member/signup' ||
    pathname.startsWith('/api/auth/')
  );
}

/** Routes that must only resolve on the gym hostname. */
function isGymOnly(pathname: string): boolean {
  return (
    pathname === '/gym' ||
    pathname.startsWith('/gym/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/api/gym/') ||
    pathname.startsWith('/api/admin/')
  );
}

export function middleware(req: NextRequest) {
  const rawHost = req.headers.get('host') || '';
  const host = rawHost.split(':')[0].toLowerCase();
  const url = req.nextUrl;
  const { pathname } = url;

  // Don't rewrite shared auth surface.
  if (isShared(pathname)) return NextResponse.next();

  const isGymHost = host === GYM_HOSTNAME;
  const isAppHost = host === APP_HOSTNAME || host === `www.${APP_HOSTNAME}`;

  // Outside production hostnames (localhost, vercel preview, custom dev) →
  // no enforcement. Every route is reachable, just like before.
  if (!isGymHost && !isAppHost) return NextResponse.next();

  // gyms.thrivv.dev/ → land on the natural entry point for the gym surface.
  if (isGymHost && pathname === '/') {
    const target = url.clone();
    target.pathname = '/gym';
    return NextResponse.redirect(target);
  }

  // gyms.thrivv.dev hitting a member route → bounce to the consumer host.
  if (isGymHost && !isGymOnly(pathname)) {
    const target = url.clone();
    target.hostname = APP_HOSTNAME;
    target.protocol = 'https:';
    target.port = '';
    return NextResponse.redirect(target, 308);
  }

  // thrivv.dev hitting a gym/admin route → bounce to the gym host.
  if (isAppHost && isGymOnly(pathname)) {
    const target = url.clone();
    target.hostname = GYM_HOSTNAME;
    target.protocol = 'https:';
    target.port = '';
    return NextResponse.redirect(target, 308);
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next.js internals and static files. /api/auth/* is allowed
  // through the matcher and short-circuited via isShared() above so
  // login works from either hostname.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
