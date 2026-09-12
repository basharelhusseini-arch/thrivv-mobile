/** Shared, pure routing rules. Never accept arbitrary login destinations. */
export function gymReturnPath(value: unknown): string {
  return typeof value === 'string' && (/^\/gym$/.test(value) || /^\/gym\/[0-9a-f-]{36}\/dashboard$/i.test(value) || value === '/admin/gyms') ? value : '/gym';
}
export function isGymLogin(hostname: string, portal: string | null): boolean {
  return hostname.toLowerCase() === (process.env.NEXT_PUBLIC_GYM_HOSTNAME || 'gyms.thrivv.dev').toLowerCase() || portal === 'gym';
}
export function gymLoginPath(returnTo = '/gym'): string {
  return `/member/login?portal=gym&redirect=${encodeURIComponent(gymReturnPath(returnTo))}`;
}
export function gymDestination(isAdmin: boolean, gyms: { id: string }[]): string | null {
  if (isAdmin) return '/admin/gyms';
  return gyms.length === 1 ? `/gym/${gyms[0].id}/dashboard` : null;
}
