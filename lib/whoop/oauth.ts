/**
 * WHOOP OAuth helpers — token exchange, refresh, and tear-down.
 *
 * All helpers run server-side only. Tokens are persisted on the
 * `users` row by the calling route; nothing here touches cookies
 * or the response body, so tokens are never visible to the
 * browser. The fetch helpers below propagate non-200 responses to
 * the caller as `WhoopOAuthError` so routes can decide how to
 * handle them (clear tokens vs surface error).
 */

import { supabase } from '@/lib/supabase';
import { getWhoopEnv } from '@/lib/env';

export const WHOOP_AUTHORIZE_URL =
  'https://api.prod.whoop.com/oauth/oauth2/auth';
export const WHOOP_TOKEN_URL =
  'https://api.prod.whoop.com/oauth/oauth2/token';
export const WHOOP_API_BASE = 'https://api.prod.whoop.com';

// Refresh slightly before expiry so a request that's already in
// flight doesn't race the renewal.
const REFRESH_BUFFER_SECONDS = 60;

export const WHOOP_SCOPES = [
  'read:recovery',
  'read:sleep',
  'read:cycles',
  'read:workout',
  'read:profile',
  'read:body_measurement',
  'offline',
].join(' ');

export type WhoopTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type?: string;
  scope?: string;
};

export class WhoopOAuthError extends Error {
  status: number;
  /** OAuth 2.0 `error` field from the token endpoint JSON body, when present. */
  oauthError?: string;

  constructor(message: string, status: number, oauthError?: string) {
    super(message);
    this.name = 'WhoopOAuthError';
    this.status = status;
    this.oauthError = oauthError;
  }
}

/**
 * True when the token endpoint failure means the stored refresh token
 * is dead (revoked, expired, wrong client) and we should wipe WHOOP
 * fields so the user sees "Disconnected" until they OAuth again.
 *
 * Never treat network failures or WHOOP 5xx as permanent — those must
 * retain tokens so the next sync / refresh can succeed without forcing
 * another consent screen.
 */
export function isPermanentTokenFailure(err: unknown): boolean {
  if (!(err instanceof WhoopOAuthError)) return false;
  if (err.status >= 500) return false;
  const code = err.oauthError?.toLowerCase();
  if (code === 'invalid_grant') return true;
  if (code === 'invalid_client') return true;
  if (code === 'unauthorized_client') return true;
  // Uncategorised 4xx — assume transient / ambiguous; keep tokens.
  return false;
}

/**
 * Exchange an OAuth authorization code for an access + refresh
 * token pair. Throws WhoopOAuthError with the upstream status on
 * non-200. The error message never includes the raw upstream body
 * so callers can safely surface it.
 */
export async function exchangeCodeForToken(
  code: string
): Promise<WhoopTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getWhoopEnv();

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });

  if (!res.ok) {
    let oauthError: string | undefined;
    try {
      const j = (await res.json()) as { error?: string };
      oauthError =
        typeof j?.error === 'string' ? j.error : undefined;
    } catch {
      /* ignore malformed body */
    }
    throw new WhoopOAuthError(
      `WHOOP token exchange failed (${res.status})`,
      res.status,
      oauthError
    );
  }
  return (await res.json()) as WhoopTokenResponse;
}

/**
 * Use a refresh token to mint a new access token. WHOOP may or may
 * not return a new refresh token; the caller is responsible for
 * persisting whatever WHOOP returns.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<WhoopTokenResponse> {
  const { clientId, clientSecret } = getWhoopEnv();

  // WHOOP docs require `scope: offline` on refresh — not the full
  // authorization scope string. Sending every read:* scope here has
  // been observed to break refresh and force users through OAuth again.
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'offline',
  });

  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });

  if (!res.ok) {
    let oauthError: string | undefined;
    try {
      const j = (await res.json()) as { error?: string };
      oauthError =
        typeof j?.error === 'string' ? j.error : undefined;
    } catch {
      /* ignore */
    }
    throw new WhoopOAuthError(
      `WHOOP token refresh failed (${res.status})`,
      res.status,
      oauthError
    );
  }
  return (await res.json()) as WhoopTokenResponse;
}

export type WhoopTokenSnapshot = {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null; // ISO timestamp
};

/**
 * Persist a fresh WHOOP token bundle on the user row. The expiry
 * is stored as an absolute timestamp so callers don't have to deal
 * with relative expires_in arithmetic later.
 *
 * If WHOOP didn't return a new refresh token (some refresh flows
 * keep the old one), `currentRefreshToken` is reused so we don't
 * overwrite a working token with null.
 */
export async function persistWhoopTokens(
  userId: string,
  tokens: WhoopTokenResponse,
  currentRefreshToken: string | null = null,
  extras: { whoopUserId?: number | null; markConnected?: boolean } = {}
): Promise<void> {
  const expiresAt = new Date(
    Date.now() + tokens.expires_in * 1000
  ).toISOString();

  const refreshToken = tokens.refresh_token ?? currentRefreshToken ?? null;

  const update: Record<string, unknown> = {
    whoop_access_token: tokens.access_token,
    whoop_refresh_token: refreshToken,
    whoop_token_expires_at: expiresAt,
  };

  if (typeof extras.whoopUserId === 'number') {
    update.whoop_user_id = extras.whoopUserId;
  }
  if (extras.markConnected) {
    update.whoop_connected_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('whoop_connections')
    .upsert({ id: userId, ...update })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to persist WHOOP tokens: ${error.message}`);
  }
}

/**
 * Wipe every WHOOP-related field on the user row. Called when the
 * user disconnects, when WHOOP returns invalid_grant on refresh, or
 * when API calls definitively fail after a retry. Never fails open.
 */
export async function clearWhoopTokens(userId: string): Promise<void> {
  const { error } = await supabase
    .from('whoop_connections')
    .update({
      whoop_user_id: null,
      whoop_access_token: null,
      whoop_refresh_token: null,
      whoop_token_expires_at: null,
      whoop_connected_at: null,
    })
    .eq('id', userId);

  if (error) {
    // Don't throw — clearing is best-effort cleanup. We log instead.
    console.error('Failed to clear WHOOP tokens:', error.message);
  }
}

/**
 * Load the current WHOOP token snapshot for a user. Returns null
 * for any field that's not set so callers can branch on
 * "connected vs not".
 */
export async function loadWhoopTokens(
  userId: string
): Promise<WhoopTokenSnapshot> {
  const { data, error } = await supabase
    .from('whoop_connections')
    .select('whoop_access_token, whoop_refresh_token, whoop_token_expires_at')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return { accessToken: null, refreshToken: null, expiresAt: null };
  }
  // Cast through unknown — the ambient Database type predates these
  // additive columns and we don't ship generated types.
  const row = data as unknown as {
    whoop_access_token: string | null;
    whoop_refresh_token: string | null;
    whoop_token_expires_at: string | null;
  };
  return {
    accessToken: row.whoop_access_token ?? null,
    refreshToken: row.whoop_refresh_token ?? null,
    expiresAt: row.whoop_token_expires_at ?? null,
  };
}

/**
 * Decide whether the access token currently on file needs to be
 * refreshed before it's used. Anything within REFRESH_BUFFER_SECONDS
 * of expiry is treated as expired so a request mid-flight doesn't
 * race the renewal.
 */
export function isTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  const expiryMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiryMs)) return true;
  return expiryMs - Date.now() <= REFRESH_BUFFER_SECONDS * 1000;
}

/**
 * Resolve a working access token for a user — refreshing on the fly
 * if needed. Returns null if WHOOP is not connected, if refresh fails
 * transiently (tokens retained), or if refresh fails permanently
 * (tokens cleared — caller should treat like disconnected).
 */
export async function getValidAccessToken(
  userId: string
): Promise<string | null> {
  const tokens = await loadWhoopTokens(userId);
  if (!tokens.accessToken || !tokens.refreshToken) return null;

  if (!isTokenExpired(tokens.expiresAt)) {
    return tokens.accessToken;
  }

  try {
    const fresh = await refreshAccessToken(tokens.refreshToken);
    await persistWhoopTokens(userId, fresh, tokens.refreshToken);
    return fresh.access_token;
  } catch (err) {
    if (isPermanentTokenFailure(err)) {
      console.error(
        'WHOOP refresh failed permanently; clearing tokens:',
        err
      );
      await clearWhoopTokens(userId);
    } else {
      console.warn(
        'WHOOP refresh failed (tokens retained for retry):',
        err
      );
    }
    return null;
  }
}
