import { cookies } from 'next/headers';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { getJWTSecret } from './env';
import { createHash, randomUUID } from 'crypto';
import { supabase } from './supabase';

function sessionSecret(): Uint8Array {
  return new TextEncoder().encode(getJWTSecret());
}

const COOKIE_NAME = 'thrivv-session';

// When set (e.g. ".thrivv.dev"), the session cookie is shared across
// subdomains so auth works on both thrivv.dev and gyms.thrivv.dev.
// When unset, behavior is unchanged (host-only cookie).
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

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
export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ user })
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
    };
  } catch (error) {
    return null;
  }
}

// Set session cookie
export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSession(user);
  const cookieStore = await cookies();
  
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  });
}

// Get current user from session cookie
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const session = await verifySession(token);
    if (!session || !session.user) {
      return null;
    }

    // Fail closed if revocation storage is unavailable. Apply its migration first.
    const { data: revoked, error } = await supabase.from('revoked_app_sessions')
      .select('token_hash').eq('token_hash', createHash('sha256').update(token).digest('hex')).maybeSingle();
    if (error) throw new Error('Session verification unavailable');
    if (revoked) return null;

    return session.user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Revoke before the logout route emits cookie deletions. Do not mutate the
// cookie store here: it deduplicates same-name cookies with different domains.
export async function revokeCurrentSession(rawCookies?: string | null): Promise<void> {
  const cookieStore = await cookies();
  // Raw header preserves duplicate names across host-only/shared cookie scopes.
  const tokens = rawCookies ? rawCookies.split(';').flatMap(part => {
    const [name, ...value] = part.trim().split('=');
    return name === COOKIE_NAME ? [value.join('=')] : [];
  }) : cookieStore.getAll(COOKIE_NAME).map(cookie => cookie.value).filter(Boolean);
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
