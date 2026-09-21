'use client';
import { useTranslation } from '@/lib/i18n/client';


import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, ArrowLeftRight, Bell, Dumbbell, Heart, LayoutDashboard, LogOut, MoreHorizontal, QrCode, Trophy, User, Users, UserPlus, UtensilsCrossed, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { logoutClient } from '@/lib/client-session';
import { portalLoginUrl } from '@/lib/gym-routing';
import Logo from './Logo';
import { isNativeApp } from '@/lib/mobile-app';
import WorkspaceLink from './WorkspaceLink';

type NavItem = { label: string; href: string; icon: typeof Activity };
const memberNavigation: NavItem[] = [
  { label: 'Home', href: '/member/dashboard', icon: LayoutDashboard },
  { label: 'Workouts', href: '/member/workouts', icon: Dumbbell },
  { label: 'Scan', href: '/member/scan-workout', icon: QrCode },
  { label: 'Rewards', href: '/member/rewards', icon: Trophy },
  { label: 'Health', href: '/member/health', icon: Activity },
  { label: 'Nutrition', href: '/member/nutrition', icon: UtensilsCrossed },
  { label: 'Reminders', href: '/member/notifications', icon: Bell },
  { label: 'Wearables', href: '/member/wearables', icon: Activity },
  { label: 'Account', href: '/member/account', icon: User },
];

export function isGymPortalPath(pathname: string | null): boolean {
  return pathname === '/gym' || !!pathname?.startsWith('/gym/') || pathname === '/admin/gyms' || !!pathname?.startsWith('/admin/gyms/');
}

export function isItemActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === item.href) return true;
    if (item.href === '/member/account') return pathname.startsWith('/member/account/') || ['/member/profile', '/member/settings'].includes(pathname);
  return item.href === '/member/bookings' && pathname === '/member/classes';
}

export default function Sidebar({ memberData = null, isPlatformAdmin = false }: {
  memberData?: { id: string; name: string; email: string } | null;
  isPlatformAdmin?: boolean;
}) {
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const logoutPending = useRef(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const workspaceRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => { setIsMoreOpen(false); if (workspaceRef.current) workspaceRef.current.open = false; }, [pathname]);

  useEffect(() => {
    if (!isMoreOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : moreRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => Array.from(sheetRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex="0"]') || []);
    focusable()[0]?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setIsMoreOpen(false); }
      if (event.key === 'Tab') {
        const targets = focusable();
        const first = targets[0]; const last = targets[targets.length - 1];
        if (event.shiftKey && (document.activeElement === first || !sheetRef.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && (document.activeElement === last || !sheetRef.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
      }
    };
    // Keep background content out of keyboard and assistive-technology navigation.
    const background = Array.from(document.querySelectorAll<HTMLElement>('[data-app-navigation],#main-content'));
    const oldInert = background.map(element => element.inert);
    background.forEach(element => { element.inert = true; });
    const media = window.matchMedia('(min-width: 1024px)');
    const resized = () => { if (media.matches) setIsMoreOpen(false); };
    media.addEventListener('change', resized);
    document.addEventListener('keydown', keyboard);
    return () => {
      document.body.style.overflow = overflow;
      background.forEach((element, index) => { element.inert = oldInert[index]; });
      document.removeEventListener('keydown', keyboard);
      media.removeEventListener('change', resized);
      if (previous?.isConnected) previous.focus();
    };
  }, [isMoreOpen]);

  const handleLogout = async () => {
    if (logoutPending.current) return;
    logoutPending.current = true; setLoggingOut(true); setLogoutError('');
    try {
      await logoutClient();
      window.location.replace(!isGymPortalPath(pathname) && isNativeApp(navigator.userAgent) ? '/mobile' : portalLoginUrl(window.location.hostname, isGymPortalPath(pathname)));
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Sign out failed. Please retry.');
      logoutPending.current = false; setLoggingOut(false);
    }
  };

  const isInGymPortal = isGymPortalPath(pathname);
  const gymBase = pathname?.match(/^\/gym\/([^/]+)\/(dashboard|members|activity|invite|qr|support)$/)?.[1];
  const gymNavigation: NavItem[] = gymBase ? [
    { label: 'Overview', href: `/gym/${gymBase}/dashboard`, icon: LayoutDashboard },
    { label: 'Members', href: `/gym/${gymBase}/members`, icon: Users },
    { label: 'Activity', href: `/gym/${gymBase}/activity`, icon: Activity },
    { label: 'Invite members', href: `/gym/${gymBase}/invite`, icon: UserPlus },
    { label: 'Display workout QR', href: `/gym/${gymBase}/qr`, icon: QrCode },
  ] : [{ label: pathname?.startsWith('/admin/gyms') ? 'Platform Admin' : 'Your gyms', href: pathname?.startsWith('/admin/gyms') ? '/admin/gyms' : '/gym', icon: LayoutDashboard }];
  const support: NavItem = { label: 'Support', href: isInGymPortal ? gymBase ? `/gym/${gymBase}/support` : '/gym/support' : '/member/account/support', icon: Heart };
  const navigation = isInGymPortal ? gymNavigation : memberNavigation;
  const primaryItems = isInGymPortal ? (gymBase ? [gymNavigation[0], gymNavigation[1], gymNavigation[4]] : gymNavigation) : memberNavigation.slice(0, 4);
  const overflowItems = navigation.filter(item => !primaryItems.includes(item));
  const moreActive = isMoreOpen || [...overflowItems, support].some(item => isItemActive(item, pathname));
  const workspaceItems: NavItem[] = [
    ...(isInGymPortal ? [{ label: 'Member app', href: '/member/dashboard', icon: User }] : []),
    { label: 'Gym portal', href: '/gym', icon: Dumbbell },
    ...(isPlatformAdmin && !pathname?.startsWith('/admin/gyms') ? [{ label: 'Platform Admin', href: '/admin/gyms', icon: Users }] : []),
  ];
  const showWorkspaces = isPlatformAdmin || isInGymPortal;
  const renderLink = (item: NavItem, compact = false) => {
    const active = isItemActive(item, pathname);
    const Icon = item.icon;
    return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`${compact ? 'flex-col justify-center text-xs min-h-[86px] p-3' : 'text-sm min-h-[44px] px-3 py-2.5'} flex items-center gap-3 rounded-xl border transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-thrivv-gold-500 ${active ? 'border-thrivv-gold-500/25 bg-thrivv-gold-500/10 text-thrivv-gold-400' : 'border-transparent text-thrivv-text-secondary hover:bg-white/[0.04] hover:text-white'}`}><Icon aria-hidden className="h-[18px] w-[18px] shrink-0" /><span>{t(item.label)}</span></Link>;
  };
  const renderWorkspaceLink = (item: NavItem) => {
    const Icon = item.icon;
    return <WorkspaceLink key={item.href} href={item.href} className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-thrivv-text-secondary hover:bg-white/[0.04] hover:text-white"><Icon aria-hidden className="h-[18px] w-[18px]" />{t(item.label)}</WorkspaceLink>;
  };
  const signOut = <button type="button" disabled={loggingOut} onClick={() => { setIsMoreOpen(false); void handleLogout(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-thrivv-text-muted hover:bg-red-500/5 hover:text-red-400 disabled:opacity-50"><LogOut aria-hidden className="h-[18px] w-[18px]" />{loggingOut ? t("Signing out…") : t("Sign out")}</button>;

  return <>
    {logoutError && <p role="alert" className="fixed bottom-24 start-4 z-[100] max-w-sm rounded-xl border border-red-500/20 bg-thrivv-bg-darker p-4 text-red-400">{t(logoutError)}</p>}
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-[100] focus:rounded-lg focus:bg-thrivv-gold-500 focus:px-4 focus:py-3 focus:text-black">{t("Skip to content")}</a>
    <aside data-app-navigation className="hidden lg:flex fixed inset-y-0 start-0 z-40 w-60 flex-col border-e border-thrivv-gold-500/10 bg-thrivv-bg-darker/90 backdrop-blur-2xl" aria-label={isInGymPortal ? t("Gym portal navigation") : t("Primary navigation")}>
      <div className="px-6 py-7"><Logo variant="gold" size="md" linkTo={isInGymPortal ? '/gym' : '/member/dashboard'} /><p className="mt-3 text-[10px] uppercase tracking-[0.24em] text-thrivv-text-muted">{isInGymPortal ? t("Gym workspace") : t("Your daily progress")}</p></div>
      {showWorkspaces && <details ref={workspaceRef} className="mx-3 mb-4 rounded-xl border border-thrivv-gold-500/15 bg-white/[0.02]"><summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-xs text-thrivv-text-secondary"><ArrowLeftRight aria-hidden className="h-4 w-4 text-thrivv-gold-500" />{t("Switch workspace")}</summary><div className="border-t border-white/5 p-1">{workspaceItems.map(renderWorkspaceLink)}</div></details>}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">{navigation.map((item, index) => <div key={item.href}>{!isInGymPortal && index === 4 && <p className="px-3 pt-6 pb-2 text-[10px] uppercase tracking-[0.18em] text-thrivv-text-muted">{t("Your routine")}</p>}{renderLink(item)}</div>)}</nav>
      <div className="m-3 border-t border-white/5 pt-2">{renderLink(support)}{memberData && <><Link href={isInGymPortal ? '/gym' : '/member/account'} className="mt-2 flex items-center gap-3 rounded-xl p-3 text-sm"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-thrivv-gold-500/20 bg-thrivv-gold-500/10 text-thrivv-gold-500"><User className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-thrivv-text-primary">{memberData.name || t("Your account")}</span><span className="block truncate text-[11px] text-thrivv-text-muted">{memberData.email}</span></span></Link>{signOut}</>}</div>
    </aside>

    <nav data-app-navigation className="lg:hidden fixed inset-x-0 bottom-0 z-40 px-3 pt-2 pb-safe" aria-label={isInGymPortal ? t("Gym portal navigation") : t("Primary navigation")}>
      <div className={`mx-auto grid max-w-lg ${primaryItems.length === 4 ? 'grid-cols-5' : primaryItems.length === 3 ? 'grid-cols-4' : 'grid-cols-2'} rounded-2xl border border-thrivv-gold-500/20 bg-thrivv-bg-darker/95 p-1 shadow-[0_-8px_40px_rgba(0,0,0,0.25)] backdrop-blur-2xl`}>
        {primaryItems.map(item => {
          const active = isItemActive(item, pathname); const Icon = item.icon;
          return <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={`relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors ${active ? 'bg-thrivv-gold-500/10 text-thrivv-gold-400' : 'text-thrivv-text-muted hover:text-white'}`}><Icon aria-hidden className="h-5 w-5" /><span>{item.label === 'Display workout QR' ? t('Gym QR') : t(item.label)}</span></Link>;
        })}
        <button ref={moreRef} type="button" onClick={() => setIsMoreOpen(true)} aria-expanded={isMoreOpen} aria-haspopup="dialog" aria-controls="more-navigation" aria-label={t("More navigation options")} className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium ${moreActive ? 'bg-thrivv-gold-500/10 text-thrivv-gold-400' : 'text-thrivv-text-muted'}`}><MoreHorizontal aria-hidden className="h-5 w-5" />{t("More")}</button>
      </div>
    </nav>

    {isMoreOpen && <>
      <div onClick={() => setIsMoreOpen(false)} aria-hidden className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" />
      <div ref={sheetRef} id="more-navigation" role="dialog" aria-modal="true" aria-labelledby="more-title" className="lg:hidden fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-thrivv-gold-500/20 bg-thrivv-bg-darker pb-safe shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5"><h2 id="more-title" className="text-xl font-semibold">{t("More")}</h2><button type="button" onClick={() => setIsMoreOpen(false)} aria-label={t("Close more navigation")} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-thrivv-text-muted"><X className="h-5 w-5" /></button></div>
        <div className="grid grid-cols-3 gap-1 px-4 pb-4">{[...overflowItems, support].map(item => renderLink(item, true))}</div>
        {showWorkspaces && <div className="mx-4 mb-3 rounded-xl border border-thrivv-gold-500/15 p-2"><p className="flex items-center gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-thrivv-text-muted"><ArrowLeftRight className="h-3.5 w-3.5" />{t("Switch workspace")}</p>{workspaceItems.map(renderWorkspaceLink)}</div>}
        {memberData && <div className="mx-4 border-t border-white/5 py-3">{signOut}</div>}
      </div>
    </>}
  </>;
}
