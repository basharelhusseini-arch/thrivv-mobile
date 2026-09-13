/** Shared, pure routing rules. Never accept arbitrary login destinations. */
export function gymReturnPath(value: unknown): string {
  return typeof value === 'string' && (/^\/gym$/.test(value) || /^\/gym\/[0-9a-f-]{36}\/dashboard$/i.test(value) || value === '/admin/gyms' || value === '/gym/support') ? value : '/gym';
}
export function isGymLogin(hostname: string, portal: string | null): boolean {
  if (portal === 'member') return false;
  return hostname.toLowerCase() === (process.env.NEXT_PUBLIC_GYM_HOSTNAME || 'gyms.thrivv.dev').toLowerCase() || portal === 'gym';
}
/** Switch on production hosts before login so host-only sessions are set correctly. */
export function portalLoginUrl(hostname: string, gym: boolean): string {
  const appHost = process.env.NEXT_PUBLIC_APP_HOSTNAME || 'thrivv.dev';
  const gymHost = process.env.NEXT_PUBLIC_GYM_HOSTNAME || 'gyms.thrivv.dev';
  const path = gym ? gymLoginPath() : '/member/login?portal=member';
  return [appHost, `www.${appHost}`, gymHost].includes(hostname.toLowerCase())
    ? `https://${gym ? gymHost : appHost}${path}` : path;
}
export function gymLoginPath(returnTo = '/gym'): string {
  return `/member/login?portal=gym&redirect=${encodeURIComponent(gymReturnPath(returnTo))}`;
}
export function gymDestination(isAdmin: boolean, gyms: { id: string }[]): string | null {
  if (isAdmin) return '/admin/gyms';
  return gyms.length === 1 ? `/gym/${gyms[0].id}/dashboard` : null;
}
