import { createClient } from '@supabase/supabase-js';
import { decodeJwt } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseEnv } from './env';
import { supabase } from './supabase';

export const PASSWORD_RESET_REDIRECT = 'https://www.thrivv.dev/member/reset-password';
export const PASSWORD_RESET_SENT_MESSAGE = 'If an account exists for this email, you will receive a password reset link.';
const INVALID_LINK = 'This reset link is invalid or has expired. Request a new link.';
const UNAVAILABLE = 'Password recovery is temporarily unavailable. Please try again.';

export class PasswordRecoveryError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export function recoveryResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

export function recoveryError(error: unknown) {
  return error instanceof PasswordRecoveryError
    ? recoveryResponse({ error: error.message }, error.status)
    : recoveryResponse({ error: UNAVAILABLE }, 503);
}

export async function recoveryBody(request: NextRequest): Promise<Record<string, unknown>> {
  if (request.headers.get('origin') !== request.nextUrl.origin || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new PasswordRecoveryError('Invalid request origin.', 403);
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new PasswordRecoveryError('JSON required.', 415);
  }
  const raw = await request.text();
  if (raw.length > 16000) throw new PasswordRecoveryError('Request too large.', 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { throw new PasswordRecoveryError('Invalid request.', 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new PasswordRecoveryError('Invalid request.', 400);
  return body as Record<string, unknown>;
}

export function recoveryClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'implicit' },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
    },
  });
}

export async function validateRecoveryToken(value: unknown) {
  if (typeof value !== 'string' || value.length < 20 || value.length > 12000) {
    throw new PasswordRecoveryError(INVALID_LINK, 401);
  }
  const client = recoveryClient();
  const { data, error } = await client.auth.getUser(value);
  if (error) {
    if (!error.status || error.status >= 500 || error.status === 429) throw new PasswordRecoveryError(UNAVAILABLE, 503);
    throw new PasswordRecoveryError(INVALID_LINK, 401);
  }
  if (!data.user) throw new PasswordRecoveryError(INVALID_LINK, 401);

  // Decode only after Auth verifies the exact token. Never refresh a recovery token.
  let claims;
  try { claims = decodeJwt(value); } catch { throw new PasswordRecoveryError(INVALID_LINK, 401); }
  const now = Math.floor(Date.now() / 1000);
  if (claims.sub !== data.user.id || typeof claims.exp !== 'number' || claims.exp <= now ||
      typeof claims.iat !== 'number' || claims.iat <= 0 || claims.iat > now + 30 ||
      typeof claims.session_id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(claims.session_id)) {
    throw new PasswordRecoveryError(INVALID_LINK, 401);
  }
  const validity = await supabase.rpc('thrivv_session_valid', {
    p_user: data.user.id, p_session: claims.session_id, p_issued_at: claims.iat,
  });
  if (validity.error) throw new PasswordRecoveryError(UNAVAILABLE, 503);
  if (validity.data !== true) throw new PasswordRecoveryError(INVALID_LINK, 401);
  return { client, accessToken: value };
}

export async function changeRecoveryPassword(accessToken: string, password: string) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  // User-scoped Auth endpoint, not an administrative password override or SDK session refresh.
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'PUT',
    headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' },
    body: JSON.stringify({ password }),
    signal: AbortSignal.timeout(10000),
    cache: 'no-store',
  });
  if (response.ok) return;
  const result = await response.json().catch(() => ({}));
  const code = result?.code || result?.error_code;
  if (response.status === 401 || response.status === 403) throw new PasswordRecoveryError(INVALID_LINK, 401);
  if (response.status === 429) throw new PasswordRecoveryError('Too many attempts. Please wait before trying again.', 429);
  if (code === 'same_password') throw new PasswordRecoveryError('Choose a password different from your current password.', 400);
  if (code === 'weak_password') throw new PasswordRecoveryError('Choose a stronger password with a mix of letters, numbers and symbols.', 400);
  if (response.status >= 500) throw new PasswordRecoveryError(UNAVAILABLE, 503);
  throw new PasswordRecoveryError('Unable to change your password. Request a new reset link and try again.', 400);
}

export async function revokeRecoverySessions(client: ReturnType<typeof recoveryClient>, accessToken: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // This logout call uses the user's bearer token and the anonymous API key.
      const { error } = await client.auth.admin.signOut(accessToken, 'global');
      if (!error) return true;
    } catch { /* The password changed already; retry logout without replaying the update. */ }
  }
  console.warn('Password recovery completed, but upstream session revocation could not be confirmed.');
  return false;
}
