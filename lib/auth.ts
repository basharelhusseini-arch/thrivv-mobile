import { cookies, headers } from 'next/headers';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { getJWTSecret } from './env';
import { createHash, randomUUID } from 'crypto';
import { supabase } from './supabase';

function sessionSecret(): Uint8Array {
  return new TextEncoder().encode(getJWTSecret());
}

const COOKIE_NAME = 'thrivv-session';

const SESSION_AGE = 60 * 60 * 24 * 7;
const SHARED_SESSION_HOSTS = new Set(['thrivv.dev', 'www.thrivv.dev', 'gyms.thrivv.dev']);

/** Never share a preview/development cookie or trust an arbitrary Host suffix. */
export function sessionCookieDomain(hostname: string): string | undefined {
  const host = hostname.toLowerCase().split(':')[0];
  return SHARED_SESSION_HOSTS.has(host) ? '.thrivv.dev' : undefined;
}

function sessionTokens(rawCookies: string | null | undefined): string[] {
  return [...new Set((rawCookies || '').split(';').flatMap(part => {
    const [name, ...value] = part.trim().split('=');
    return name === COOKIE_NAME && value.join('=') ? [value.join('=')] : [];
  }))];
}

/** Explicit headers preserve same-name host-only and domain cookie writes. */
export function writeSessionCookie(response: Response, token: string, hostname: string, expiresAt?: number): void {
  const domain = sessionCookieDomain(hostname);
  const secure = domain || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const options = `Path=/; HttpOnly; SameSite=Lax${secure}`;
  if (domain) response.headers.append('Set-Cookie', `${COOKIE_NAME}=; ${options}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
  const maxAge = expiresAt ? Math.max(0, Math.min(SESSION_AGE, expiresAt - Math.floor(Date.now() / 1000))) : SESSION_AGE;
  response.headers.append('Set-Cookie', `${COOKIE_NAME}=${token}; ${options}; Max-Age=${maxAge}${domain ? `; Domain=${domain}` : ''}`);
}

export function clearSessionCookies(response: Response, hostname: string): void {
  const domain = sessionCookieDomain(hostname);
  const expired = `${COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${domain || process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
  response.headers.append('Set-Cookie', expired);
  if (domain) response.headers.append('Set-Cookie', `${expired}; Domain=${domain}`);
}

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface SessionPayload {
  user: SessionUser;
  exp?: number;
  iat?: number;
  sid?: string;
  issuedAt?: number;
}

// Type guard to validate user object structure
function isValidSessionUser(user: unknown): user is SessionUser {
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    'email' in user &&
    'firstName' in user &&
    'lastName' in user &&
    typeof user.id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.firstName === 'string' &&
    typeof user.lastName === 'string'
  );
}

// Type guard to check if payload has a user property
function hasUserProperty(payload: JWTPayload): payload is JWTPayload & { user: unknown } {
  return 'user' in payload && typeof payload.user === 'object' && payload.user !== null;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Create JWT session token
export async function createSession(user: SessionUser, sid?: string): Promise<string> {
  const token = await new SignJWT({ user, issuedAt: Date.now() / 1000, ...(sid ? { sid } : {}) })
    .setJti(randomUUID())
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d') // 7 days
    .setIssuedAt()
    .sign(sessionSecret());

  return token;
}

// Verify JWT session token
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecret(), { algorithms: ['HS256'] });
    
    // Check if payload has user property
    if (!hasUserProperty(payload)) {
      console.error('Invalid session payload: missing user property');
      return null;
    }
    
    // Validate user object structure at runtime
    if (!isValidSessionUser(payload.user)) {
      console.error('Invalid session user structure');
      return null;
    }
    
    // Build a properly typed SessionPayload object
    const { id, email, firstName, lastName } = payload.user;
    return {
      user: {
        id,
        email,
        firstName,
        lastName,
      },
      iat: payload.iat,
      exp: payload.exp,
      ...(typeof payload.sid === 'string' ? { sid: payload.sid } : {}),
      ...(typeof payload.issuedAt === 'number' ? { issuedAt: payload.issuedAt } : {}),
    };
  } catch (error) {
    return null;
  }
}

// Set session cookie
export async function setSessionCookie(user: SessionUser, response: Response, hostname: string, sid?: string): Promise<void> {
  const token = await createSession(user, sid);
  writeSessionCookie(response, token, hostname);
}

export async function getAuthenticatedSession(): Promise<{ token: string; session: SessionPayload } | null> {
  const cookieStore = await cookies();
  // Next's parsed cookie store can discard duplicate cookie names. The raw
  // header is necessary while existing host-only cookies migrate to shared scope.
  const requestHeaders = await headers();
  const raw = requestHeaders?.get('cookie');
  const tokens = raw !== null && raw !== undefined ? sessionTokens(raw) :
    [...new Set(cookieStore.getAll(COOKIE_NAME).map(cookie => cookie.value).filter(Boolean))];
  let selected: { token: string; session: SessionPayload } | null = null;
  for (const token of tokens) {
    const session = await verifySession(token);
    if (!session) continue;
    // Fail closed if revocation storage is unavailable. Apply its migration first.
    const { data: revoked, error } = await supabase.from('revoked_app_sessions')
      .select('token_hash').eq('token_hash', createHash('sha256').update(token).digest('hex')).maybeSingle();
    if (error) throw new Error('Session verification unavailable');
    // Never revive an older session when a logged-out cookie shadows it.
    if (revoked) return null;
    const { data: active, error: activeError } = await supabase.rpc('thrivv_session_valid', {
      p_user: session.user.id, p_issued_at: session.issuedAt ?? session.iat ?? 0, p_session: session.sid ?? null,
    });
    if (activeError) throw new Error('Session verification unavailable');
    if (active !== true) return null;
    if (selected && selected.session.user.id !== session.user.id) return null;
    if (!selected || (session.iat || 0) > (selected.session.iat || 0)) selected = { token, session };
  }
  return selected;
}

// Unavailable verification is an error, not a signed-out session. This prevents
// a temporary database outage from sending authenticated users back to login.
export async function getCurrentUser(): Promise<SessionUser | null> {
  return (await getAuthenticatedSession())?.session.user || null;
}

// Revoke before the logout route emits cookie deletions. Do not mutate the
// cookie store here: it deduplicates same-name cookies with different domains.
export async function revokeCurrentSession(rawCookies?: string | null): Promise<void> {
  const cookieStore = await cookies();
  // Raw header preserves duplicate names across host-only/shared cookie scopes.
  const tokens = rawCookies ? sessionTokens(rawCookies) : cookieStore.getAll(COOKIE_NAME).map(cookie => cookie.value).filter(Boolean);
  for (const token of new Set(tokens)) {
    if (!await verifySession(token)) continue;
    const { error } = await supabase.from('revoked_app_sessions').insert({
      token_hash: createHash('sha256').update(token).digest('hex'),
    });
    if (error && error.code !== '23505') throw new Error('Session revocation unavailable');
  }
}

// Require authentication middleware
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
