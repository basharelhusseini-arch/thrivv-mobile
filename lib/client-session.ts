'use client';
export const LOGOUT_EVENT = 'thrivv:logged-out';
export async function logoutClient(): Promise<void> {
  const response = await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Sign out failed. Please retry.');
  // Storage may be unavailable in private browsing; that must not prevent navigation.
  try {
    for (const key of ['memberId', 'memberName', 'memberEmail']) localStorage.removeItem(key);
    for (const storage of [localStorage, sessionStorage]) {
      for (const key of Object.keys(storage)) if (key.startsWith('thrivv:')) storage.removeItem(key);
    }
    localStorage.setItem(LOGOUT_EVENT, String(Date.now()));
  } catch { /* The server session has still been revoked. */ }
  window.dispatchEvent(new Event(LOGOUT_EVENT));
}
