/**
 * GET /api/whoop/callback
 *
 * WHOOP redirects the user here after the consent screen with a
 * `code` and the `state` we planted in /connect. We:
 *   1. Validate state against the cookie (bound to the user id).
 *   2. Verify the request belongs to a logged-in Thrivv session.
 *   3. Exchange the code for tokens.
 *   4. Optionally enrich with the WHOOP user id (best-effort).
 *   5. Persist tokens on the user row.
 *   6. Redirect to /member/dashboard with a status flag in the URL.
 *
 * No tokens are ever included in the redirect URL or response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  exchangeCodeForToken,
  persistWhoopTokens,
} from '@/lib/whoop/oauth';
import { fetchProfile } from '@/lib/whoop/api';
import { WHOOP_STATE_COOKIE } from '@/lib/whoop/constants';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thrivv.dev';

function dashboardUrl(status: 'connected' | 'error') {
  return new URL(`/member/dashboard?whoop=${status}`, SITE_URL);
}

export async function GET(request: NextRequest) {
  // 1. Auth — must be logged in. Redirect to login if not.
  let userId: string;
  try {
    const user = await requireAuth();
    userId = user.id;
  } catch {
    return NextResponse.redirect(
      new URL('/member/login?redirect=/member/wearables', SITE_URL)
    );
  }

  // 2. State validation (bound to user id).
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const cookieState = request.cookies.get(WHOOP_STATE_COOKIE)?.value;

  // Always clear the state cookie on the way out.
  const clearStateCookie = (response: NextResponse) => {
    response.cookies.set(WHOOP_STATE_COOKIE, '', {
      path: '/',
      maxAge: 0,
    });
    return response;
  };

  if (!code || !state || !cookieState) {
    return clearStateCookie(NextResponse.redirect(dashboardUrl('error')));
  }
  if (state !== cookieState || !state.startsWith(`${userId}.`)) {
    return clearStateCookie(NextResponse.redirect(dashboardUrl('error')));
  }

  // 3. Token exchange.
  try {
    const tokens = await exchangeCodeForToken(code);

    // 4. Best-effort: fetch WHOOP user id. Failure here doesn't
    //    fail the whole connection — tokens are still saved.
    let whoopUserId: number | null = null;
    try {
      const profile = await fetchProfile(tokens.access_token);
      whoopUserId = profile?.whoopUserId ?? null;
    } catch {
      // ignore — non-fatal
    }

    // 5. Persist.
    await persistWhoopTokens(userId, tokens, null, {
      whoopUserId,
      markConnected: true,
    });

    return clearStateCookie(NextResponse.redirect(dashboardUrl('connected')));
  } catch (err) {
    console.error('WHOOP callback failed:', err);
    return clearStateCookie(NextResponse.redirect(dashboardUrl('error')));
  }
}
