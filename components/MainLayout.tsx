'use client';

import { ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar, { isGymPortalPath } from './Sidebar';
import BackgroundLayers from './BackgroundLayers';
import { LOGOUT_EVENT } from '@/lib/client-session';
import { portalLoginUrl } from '@/lib/gym-routing';

export default function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [retry, setRetry] = useState(0);
  const [profile, setProfile] = useState<{ id: string; name: string; email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const protectedPage = isGymPortalPath(pathname) || /^\/(member|members|workouts|nutrition|classes|trainers|memberships|exercises|recipes|habits|health)(\/|$)/.test(pathname || '');
    const publicPage = !protectedPage || pathname === '/member/login' || pathname === '/member/signup';
    if (publicPage) { delete document.documentElement.dataset.sessionHidden; setAuthError(''); setIsLoading(false); return; }
    let active = true;
    let controller: AbortController | null = null;
    const login = () => {
      setIsLoading(true); setProfile(null); setIsAuthenticated(false);
      window.location.replace(portalLoginUrl(window.location.hostname, isGymPortalPath(pathname)));
    };
    const checkAuth = async () => {
      controller?.abort(); controller = new AbortController();
      const current = controller;
      setIsLoading(true); setAuthError('');
      const timer = setTimeout(() => current.abort(), 10000);
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store', signal: current.signal });
        if (!active || current !== controller) return;
        if (res.status === 401) { login(); return; }
        if (!res.ok) throw new Error('Session check failed. Please retry.');
        const data = await res.json();
        if (!active || current !== controller) return;
        if (!data.user) throw new Error('Session check failed. Please retry.');
        setProfile({ id: data.user.id, name: `${data.user.firstName} ${data.user.lastName}`, email: data.user.email });
        setIsAdmin(data.isPlatformAdmin === true); setIsAuthenticated(true); setIsLoading(false);
        delete document.documentElement.dataset.sessionHidden;
      } catch {
        if (active && current === controller) { setAuthError('Unable to verify your session. Please retry.'); setIsLoading(false); delete document.documentElement.dataset.sessionHidden; }
      } finally { clearTimeout(timer); }
    };
    const visibility = () => {
      if (document.hidden) { setIsLoading(true); controller?.abort(); controller = null; }
      else void checkAuth();
    };
    const restored = (event: PageTransitionEvent) => { if (event.persisted) void checkAuth(); };
    const leaving = () => { document.documentElement.dataset.sessionHidden = 'true'; };
    const storage = (event: StorageEvent) => { if (event.key === LOGOUT_EVENT) void checkAuth(); };
    void checkAuth();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pageshow', restored);
    window.addEventListener('pagehide', leaving);
    window.addEventListener('storage', storage);
    window.addEventListener(LOGOUT_EVENT, login);
    return () => {
      active = false; controller?.abort();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pageshow', restored);
      window.removeEventListener('pagehide', leaving);
      window.removeEventListener('storage', storage);
      window.removeEventListener(LOGOUT_EVENT, login);
    };
  }, [pathname, retry]);

  // Public pages that should NEVER show sidebar (even if logged in)
  const isPublicAuthPage =
    pathname === '/member/login' ||
    pathname === '/member/signup' ||
    pathname === '/';

  // Protected routes that require authentication
  const isProtectedRoute =
    pathname?.startsWith('/member') ||
    pathname?.startsWith('/members') ||
    pathname?.startsWith('/workouts') ||
    pathname?.startsWith('/nutrition') ||
    pathname?.startsWith('/classes') ||
    pathname?.startsWith('/trainers') ||
    pathname?.startsWith('/memberships') ||
    pathname?.startsWith('/exercises') ||
    pathname?.startsWith('/recipes') ||
    pathname?.startsWith('/habits') ||
    pathname?.startsWith('/health');

  // Gym pages enforce session and permissions on the server. Cached member
  // profile data must not determine which portal chrome they receive.
  const isGymPortal = isGymPortalPath(pathname);
  const showSidebar = !isPublicAuthPage && (isGymPortal || (isAuthenticated && isProtectedRoute));

  if (authError && !isPublicAuthPage) return <div role="alert" className="min-h-screen bg-thrivv-bg-darker p-8 text-white">{authError} <button onClick={() => setRetry(n => n + 1)} className="text-thrivv-gold-500 underline">Retry</button></div>;

  if (isLoading && !profile) {
    return (
      <div className="min-h-screen bg-thrivv-bg-darker text-thrivv-text-primary relative overflow-hidden">
        <BackgroundLayers />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-thrivv-gold-500/20 blur-xl animate-pulse" aria-hidden />
              <div className="relative w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/40 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-thrivv-gold-500 animate-pulse" />
              </div>
            </div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-thrivv-text-muted">
              Loading
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Public pages or unauthenticated - no sidebar, no chrome (landing/login/signup own their backdrop)
  if (!showSidebar) {
    return (
      <div className="min-h-screen bg-thrivv-bg-dark">
        {children}
      </div>
    );
  }

  // Authenticated app — cinematic backdrop + glass sidebar + content stack
  return (<>
    {isLoading && <p role="status" className="fixed inset-0 z-50 flex items-center justify-center bg-thrivv-bg-darker text-thrivv-text-primary">Verifying session…</p>}
    <div aria-busy={isLoading} style={isLoading ? { visibility: 'hidden' } : undefined} data-gym-portal={isGymPortal ? 'true' : undefined} className="min-h-screen bg-thrivv-bg-darker text-thrivv-text-primary relative overflow-x-hidden">
      <BackgroundLayers />

      <Sidebar memberData={profile} isPlatformAdmin={isAdmin} />

      <main className="relative z-10 lg:ml-24 px-5 sm:px-8 lg:px-12 pt-8 pb-28 lg:py-10">
        {children}
      </main>
    </div>
  </>);
}
