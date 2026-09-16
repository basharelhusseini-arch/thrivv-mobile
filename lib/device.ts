/**
 * Privacy-Safe Device ID Management
 * 
 * Uses first-party httpOnly cookie (not invasive fingerprinting)
 * - Cookie name: __thrivv_did
 * - httpOnly: true (cannot be read by JS)
 * - secure: true (HTTPS only in production)
 * - sameSite: 'lax'
 * - 1 year expiration
 */

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const DEVICE_ID_COOKIE_NAME = '__thrivv_did';
const DEVICE_ID_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Generate a new device ID (UUID v4)
 */
function generateDeviceId(): string {
  // Simple UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create device ID from cookies (server-side only)
 * Returns the device ID and a boolean indicating if it was newly created
 */
export async function getOrCreateDeviceId(): Promise<{ deviceId: string; isNew: boolean }> {
  const cookieStore = await cookies();
  const existingDeviceId = cookieStore.get(DEVICE_ID_COOKIE_NAME)?.value;

  if (existingDeviceId && existingDeviceId.length > 0) {
    return { deviceId: existingDeviceId, isNew: false };
  }

  // Create new device ID
  const newDeviceId = generateDeviceId();
  
  // Set httpOnly cookie
  cookieStore.set({
    name: DEVICE_ID_COOKIE_NAME,
    value: newDeviceId,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: DEVICE_ID_MAX_AGE,
    path: '/',
  });

  return { deviceId: newDeviceId, isNew: true };
}

/**
 * Get device ID from request (for API routes)
 */
export function getDeviceIdFromRequest(request: NextRequest): string | null {
  return request.cookies.get(DEVICE_ID_COOKIE_NAME)?.value || null;
}

/**
 * Create device ID and return Set-Cookie header value
 * (Use when you need to set cookie in API response)
 */
export function createDeviceIdCookie(): { deviceId: string; setCookieHeader: string } {
  const deviceId = generateDeviceId();
  const isSecure = process.env.NODE_ENV === 'production';
  
  const setCookieHeader = [
    `${DEVICE_ID_COOKIE_NAME}=${deviceId}`,
    `Max-Age=${DEVICE_ID_MAX_AGE}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    isSecure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');

  return { deviceId, setCookieHeader };
}

/**
 * Extract coarse IP prefix from request headers (/24 network)
 * PRIVACY: Only stores first 3 octets, never the full IP
 * Returns format: "192.168.1.0/24"
 */
export function getIpPrefix(request: NextRequest): string | null {
  // Try x-forwarded-for first (Vercel, most proxies)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  const rawIp = forwardedFor?.split(',')[0].trim() || realIp || null;
  
  if (!rawIp) return null;
  
  // Extract IPv4 /24 prefix (first 3 octets)
  const ipv4Match = rawIp.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/);
  if (ipv4Match) {
    return `${ipv4Match[1]}.${ipv4Match[2]}.${ipv4Match[3]}.0/24`;
  }
  
  // IPv6: take first 48 bits (simplified)
  const ipv6Match = rawIp.match(/^([0-9a-f:]+)/i);
  if (ipv6Match && rawIp.includes(':')) {
    const segments = rawIp.split(':').slice(0, 3);
    return `${segments.join(':')}::/48`;
  }
  
  return null;
}

/**
 * Parse User-Agent into coarse features (no invasive fingerprinting)
 * Returns: { ua_family, os_family, browser_family }
 */
export function parseUserAgent(userAgent: string | null): {
  ua_family: string;
  os_family: string;
  browser_family: string;
} {
  if (!userAgent) {
    return { ua_family: 'unknown', os_family: 'unknown', browser_family: 'unknown' };
  }

  const ua = userAgent.toLowerCase();

  // Browser family
  let browser_family = 'other';
  if (ua.includes('chrome') && !ua.includes('edg')) browser_family = 'chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser_family = 'safari';
  else if (ua.includes('firefox')) browser_family = 'firefox';
  else if (ua.includes('edg')) browser_family = 'edge';
  else if (ua.includes('opera') || ua.includes('opr')) browser_family = 'opera';

  // OS family
  let os_family = 'other';
  if (ua.includes('win')) os_family = 'windows';
  else if (ua.includes('mac')) os_family = 'macos';
  else if (ua.includes('linux')) os_family = 'linux';
  else if (ua.includes('android')) os_family = 'android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os_family = 'ios';

  return {
    ua_family: browser_family,
    os_family,
    browser_family,
  };
}
