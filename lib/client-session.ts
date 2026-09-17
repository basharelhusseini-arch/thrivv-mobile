'use client';

import { sendNativeReminders } from '@/lib/native-reminders';

import { createContext, createElement, ReactNode, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';

export const LOGOUT_EVENT = 'thrivv:logged-out';
export interface ClientSessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}
export interface ClientSession {
  user: ClientSessionUser | null;
  isPlatformAdmin: boolean;
  status: 'loading' | 'authenticated' | 'unauthenticated' | 'error';
  error: string;
}
const initialSession: ClientSession = { user: null, isPlatformAdmin: false, status: 'loading', error: '' };
const SessionContext = createContext<(ClientSession & { refresh: () => Promise<void> }) | null>(null);
const useSessionCommitEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
let pendingSession: { promise: Promise<ClientSession>; controller: AbortController } | null = null;
let sessionGeneration = 0;

/** A visibility/account boundary must never reuse a request from an old login. */
export function invalidateClientSession(): void {
  sessionGeneration++;
  const pending = pendingSession;
  pendingSession = null;
  pending?.controller.abort();
}

/** The server cookie is the sole login authority. Storage is never consulted. */
export function getClientSession(): Promise<ClientSession> {
  if (pendingSession) return pendingSession.promise;
  const generation = sessionGeneration;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  const assertCurrent = () => {
    if (generation !== sessionGeneration) throw new Error('Session request superseded');
  };
  const promise = (async () => {
    const response = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal });
    assertCurrent();
    if (response.status === 401) return { ...initialSession, status: 'unauthenticated' as const };
    if (!response.ok) throw new Error('Unable to verify your session. Please retry.');
    const data = await response.json();
    assertCurrent();
    if (!data.user || typeof data.user.id !== 'string' || typeof data.user.email !== 'string') throw new Error('Unable to verify your session. Please retry.');
    return { user: data.user, isPlatformAdmin: data.isPlatformAdmin === true, status: 'authenticated' as const, error: '' };
  })().finally(() => {
    clearTimeout(timer);
    // An aborted request can settle after its replacement has already started.
    if (pendingSession?.controller === controller) pendingSession = null;
  });
  pendingSession = { promise, controller };
  return promise;
}

export function ClientSessionProvider({ children, route, serverUserId }: { children: ReactNode; route: string; serverUserId: string | null }) {
  const [session, setSession] = useState<ClientSession>(initialSession);
  const version = useRef(0);
  const mounted = useRef(false);
  // The first /me check must match the request that authorized the RSC payload,
  // even when the browser cookie changed before hydration completed.
  const identity = useRef<string | null>(serverUserId);
  const reloading = useRef(false);
  // Reveal only after React has committed the verified identity and replaced
  // the old account's keyed subtree; never reveal it before setState commits.
  useSessionCommitEffect(() => {
    if (session.status !== 'loading' && !reloading.current) delete document.documentElement.dataset.sessionHidden;
  }, [session]);
  const refresh = useCallback(async () => {
    if (reloading.current) return;
    const current = ++version.current;
    try {
      const next = await getClientSession();
      if (mounted.current && current === version.current) {
        if (next.user && identity.current !== next.user.id) {
          // Server Component children can contain the previous account's data.
          // Rebuild the entire document under the new cookie before showing it.
          reloading.current = true;
          version.current++;
          document.documentElement.dataset.sessionHidden = 'true';
          setSession(initialSession);
          window.location.reload();
          return;
        }
        identity.current = next.user?.id || null;
        setSession(next);
      }
    } catch {
      if (mounted.current && current === version.current) {
        setSession({ ...initialSession, status: 'error', error: 'Unable to verify your session. Please retry.' });
      }
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; invalidateClientSession(); };
  }, []);
  useEffect(() => { void refresh(); }, [route, refresh]);
  useEffect(() => {
    const hide = () => {
      version.current++;
      invalidateClientSession();
      document.documentElement.dataset.sessionHidden = 'true';
    };
    const revalidate = () => { hide(); void refresh(); };
    const visibility = () => { if (document.hidden) hide(); else revalidate(); };
    const restored = (event: PageTransitionEvent) => { if (event.persisted) revalidate(); };
    const logout = () => {
      version.current++;
      invalidateClientSession();
      setSession({ ...initialSession, status: 'unauthenticated' });
    };
    const storage = (event: StorageEvent) => { if (event.key === LOGOUT_EVENT) revalidate(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pageshow', restored);
    window.addEventListener('pagehide', hide);
    window.addEventListener('storage', storage);
    window.addEventListener(LOGOUT_EVENT, logout);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pageshow', restored);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('storage', storage);
      window.removeEventListener(LOGOUT_EVENT, logout);
    };
  }, [refresh]);
  return createElement(SessionContext.Provider, { value: { ...session, refresh } }, children);
}

export function useClientSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useClientSession must be used inside the authenticated app layout');
  return session;
}

export async function logoutClient(): Promise<void> {
  const response = await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Sign out failed. Please retry.');
  clearClientAccountData();
}

/** Also used after server-confirmed account deletion; no second logout request. */
export function clearClientAccountData(): void {
  sendNativeReminders([]);
  // Stop any /me response still in flight before announcing successful logout.
  invalidateClientSession();
  // Storage may be unavailable in private browsing; server logout still succeeds.
  try {
    for (const key of ['memberId', 'memberName', 'memberEmail']) localStorage.removeItem(key);
    for (const storage of [localStorage, sessionStorage]) {
      for (const key of Object.keys(storage)) if (key.startsWith('thrivv:')) storage.removeItem(key);
    }
    localStorage.setItem(LOGOUT_EVENT, String(Date.now()));
  } catch { /* The server session has still been revoked. */ }
  window.dispatchEvent(new Event(LOGOUT_EVENT));
}
