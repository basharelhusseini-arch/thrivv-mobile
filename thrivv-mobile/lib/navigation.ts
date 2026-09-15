export const THRIVV_URL = 'https://thrivv.dev/mobile';
const APP_HOSTS = new Set(['thrivv.dev', 'www.thrivv.dev', 'gyms.thrivv.dev']);

export function appUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password &&
      !url.port && APP_HOSTS.has(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

export function startsWhoop(value: string): boolean {
  try {
    const url = new URL(value);
    return Boolean(appUrl(value) && url.pathname === '/api/whoop/connect') ||
      (url.protocol === 'https:' && url.hostname === 'api.prod.whoop.com' &&
        !url.port && !url.username && !url.password && url.pathname === '/oauth/oauth2/auth');
  } catch {
    return false;
  }
}

export function navigationTarget(value: string, whoopActive: boolean): 'app' | 'provider' | 'external' | 'blocked' {
  if (appUrl(value)) return 'app';
  try {
    const url = new URL(value);
    if (url.username || url.password) return 'blocked';
    if (url.protocol === 'https:') {
      // WHOOP can redirect through hosted login providers. Keep its complete
      // HTTPS journey in the same cookie store; display the real host natively.
      return whoopActive || startsWhoop(value) ? 'provider' : 'external';
    }
    if (url.protocol === 'mailto:' || url.protocol === 'tel:') return 'external';
  } catch {
    // Malformed and executable URLs must never reach native Linking.
  }
  return 'blocked';
}
