import { cookies } from 'next/headers';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { getJWTSecret } from './env';

// Get JWT secret - will throw clear error if missing
let JWT_SECRET: Uint8Array;
try {
  JWT_SECRET = new TextEncoder().encode(getJWTSecret());
} catch (error) {
  // Fallback for build time - runtime will fail with helpful error
  JWT_SECRET = new TextEncoder().encode('build-time-placeholder-secret');
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  JWT_SECRET not set. Using placeholder for build.');
  }
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
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d') // 7 days
    .setIssuedAt()
    .sign(JWT_SECRET);

  return token;
}

// Verify JWT session token
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
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

    return session.user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Clear session cookie
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  if (COOKIE_DOMAIN) {
    // Domain-scoped cookies must be cleared with the same domain attribute.
    cookieStore.set(COOKIE_NAME, '', {
      expires: new Date(0),
      path: '/',
      domain: COOKIE_DOMAIN,
    });
  } else {
    cookieStore.delete(COOKIE_NAME);
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
