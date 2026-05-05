/**
 * GET /api/whoop/connect
 *
 * Begin the WHOOP OAuth flow. Requires an authenticated Thrivv
 * session (custom JWT cookie via lib/auth.ts — this app does not
 * use Supabase Auth). Plants a single-use, signed state value in
 * an HTTP-only cookie and redirects the user to WHOOP's
 * authorization endpoint. The /callback route verifies the state
 * before exchanging the auth code.
 */

import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { requireAuth } from '@/lib/auth';
import { getWhoopEnv } from '@/lib/env';
import { WHOOP_AUTHORIZE_URL, WHOOP_SCOPES } from '@/lib/whoop/oauth';
import { WHOOP_STATE_COOKIE } from '@/lib/whoop/constants';

export async function GET() {
  let userId: string;
  try {
    const user = await requireAuth();
    userId = user.id;
  } catch {
    return NextResponse.redirect(
      new URL(
        '/member/login?redirect=/member/wearables',
        process.env.NEXT_PUBLIC_SITE_URL || 'https://thrivv.dev'
      )
    );
  }

  let env;
  try {
    env = getWhoopEnv();
  } catch (err) {
    console.error('WHOOP env check failed:', err);
    return NextResponse.json(
      { error: 'WHOOP integration is not configured' },
      { status: 500 }
    );
  }

  // Bind the state to this user so a stolen state cookie from one
  // user can't be replayed against another.
  const state = `${userId}.${randomBytes(24).toString('hex')}`;

  const authorizeUrl = new URL(WHOOP_AUTHORIZE_URL);
  authorizeUrl.searchParams.set('client_id', env.clientId);
  authorizeUrl.searchParams.set('redirect_uri', env.redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', WHOOP_SCOPES);
  authorizeUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authorizeUrl.toString());
  response.cookies.set(WHOOP_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60, // 10 minutes
  });
  return response;
}
