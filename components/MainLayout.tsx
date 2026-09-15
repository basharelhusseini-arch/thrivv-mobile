'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar, { isGymPortalPath } from './Sidebar';
import BackgroundLayers from './BackgroundLayers';
import { ClientSessionProvider, useClientSession } from '@/lib/client-session';
import { portalLoginUrl } from '@/lib/gym-routing';
import type { ServerSessionIdentity } from '@/lib/server-session-identity';
import { isNativeApp } from '@/lib/mobile-app';
import WearableSetup from './WearableSetup';

function SessionLoading() {
  return <div role="status" className="min-h-screen bg-thrivv-bg-darker text-thrivv-text-primary flex items-center justify-center"><div className="flex flex-col items-center gap-4"><span className="h-10 w-10 rounded-2xl border border-thrivv-gold-500/30 bg-thrivv-gold-500/10 flex items-center justify-center"><span className="h-2 w-2 rounded-full bg-thrivv-gold-500 motion-safe:animate-pulse" /></span><span className="text-xs tracking-widest text-thrivv-text-muted">Opening your workspace…</span></div></div>;
}

function AuthenticatedLayout({ children, pathname }: { children: ReactNode; pathname: string }) {
  const { user, status, error, isPlatformAdmin, refresh } = useClientSession();
  const isGymPortal = isGymPortalPath(pathname);
  useEffect(() => {
    if (status === 'unauthenticated') window.location.replace(!isGymPortal && isNativeApp(navigator.userAgent) ? '/mobile' : portalLoginUrl(window.location.hostname, isGymPortal));
  }, [status, isGymPortal]);
  if (status === 'error') return <div role="alert" className="min-h-screen bg-thrivv-bg-darker p-8 text-white flex flex-col items-center justify-center gap-4"><p>{error}</p><button onClick={() => void refresh()} className="btn-primary px-6 py-3">Try again</button></div>;
  if (!user) return <SessionLoading />;
  return <div key={user.id} data-gym-portal={isGymPortal ? 'true' : undefined} className="min-h-screen bg-thrivv-bg-darker text-thrivv-text-primary relative overflow-x-hidden">
    <BackgroundLayers />
    <Sidebar memberData={{ id: user.id, name: `${user.firstName} ${user.lastName}`.trim(), email: user.email }} isPlatformAdmin={isPlatformAdmin} />
    <main id="main-content" className="relative z-10 lg:ml-60 px-4 sm:px-7 lg:px-10 pt-6 pb-28 lg:py-8">{!isGymPortal && <WearableSetup key={user.id} userId={user.id} />}{children}</main>
  </div>;
}

export default function MainLayout({ children, serverIdentity }: { children: ReactNode; serverIdentity: ServerSessionIdentity }) {
  const pathname = usePathname() || '/';
  const isProtected = isGymPortalPath(pathname) || /^\/(member|members|workouts|nutrition|classes|trainers|memberships|exercises|recipes|habits|health)(\/|$)/.test(pathname);
  const isPublic = !isProtected || pathname === '/member/login' || pathname === '/member/signup';
  useEffect(() => { if (isPublic || serverIdentity.status === 'unavailable') delete document.documentElement.dataset.sessionHidden; }, [isPublic, serverIdentity.status]);
  if (isPublic) return <div className="min-h-screen bg-thrivv-bg-dark">{children}</div>;
  if (serverIdentity.status === 'unavailable') return <div role="alert" className="min-h-screen bg-thrivv-bg-darker p-8 text-white flex flex-col items-center justify-center gap-4"><p>Unable to verify this workspace. Please retry.</p><button onClick={() => window.location.reload()} className="btn-primary px-6 py-3">Try again</button></div>;
  return <ClientSessionProvider route={pathname} serverUserId={serverIdentity.status === 'authenticated' ? serverIdentity.userId : null}><AuthenticatedLayout pathname={pathname}>{children}</AuthenticatedLayout></ClientSessionProvider>;
}
