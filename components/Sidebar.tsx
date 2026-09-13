'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  Calendar,
  UserCog,
  LogIn,
  LogOut,
  Dumbbell,
  UtensilsCrossed,
  Target,
  Heart,
  Trophy,
  User,
  ChefHat,
  X,
  MoreHorizontal,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Logo from './Logo';

// Admin/Trainer navigation
const adminNavigation = [
  { name: 'Dashboard', label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Health Statistics', label: 'Health', href: '/health', icon: Activity },
  { name: 'Classes', label: 'Classes', href: '/classes', icon: Calendar },
  { name: 'Trainers', label: 'Trainers', href: '/trainers', icon: UserCog },
  { name: 'Workouts', label: 'Workouts', href: '/workouts', icon: Dumbbell },
  { name: 'Recipes', label: 'Recipes', href: '/recipes', icon: UtensilsCrossed },
  { name: 'Diet Tracker', label: 'Nutrition', href: '/nutrition', icon: Heart },
  { name: 'Habit Tracker', label: 'Habits', href: '/habits', icon: Target },
];

// Member navigation
const memberNavigation = [
  { name: 'Dashboard', label: 'Dashboard', href: '/member/dashboard', icon: LayoutDashboard },
  { name: 'My Workouts', label: 'Workouts', href: '/member/workouts', icon: Dumbbell },
  { name: 'My Nutrition', label: 'Nutrition', href: '/member/nutrition', icon: UtensilsCrossed },
  { name: 'Bookings', label: 'Bookings', href: '/member/bookings', icon: Calendar },
  { name: 'Health Score', label: 'Health', href: '/member/health', icon: Activity },
  { name: 'Rewards', label: 'Rewards', href: '/member/rewards', icon: Trophy },
  { name: 'Wearable', label: 'Wearable', href: '/member/wearables', icon: Heart },
  { name: 'Account', label: 'Account', href: '/member/account', icon: UserCog },
];

// Hrefs surfaced as the 4 primary tabs on the mobile bottom nav.
// Anything not in this list shows up inside the "More" sheet instead.
const memberPrimaryHrefs = [
  '/member/dashboard',
  '/member/workouts',
  '/member/nutrition',
  '/member/health',
];
const adminPrimaryHrefs = ['/', '/health', '/workouts', '/nutrition'];

type NavItem = (typeof memberNavigation)[number];

export function isGymPortalPath(pathname: string | null): boolean {
  return pathname === '/gym' || !!pathname?.startsWith('/gym/') ||
    pathname === '/admin/gyms' || !!pathname?.startsWith('/admin/gyms/');
}

function isItemActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === item.href) return true;
  if (item.href === '/member/account' && pathname.startsWith('/member/account/')) return true;
  // Bookings tab also activates on the legacy /member/classes redirect target.
  if (item.href === '/member/bookings' && pathname === '/member/classes') return true;
  return false;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [memberData, setMemberData] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    const memberId = localStorage.getItem('memberId');
    const memberName = localStorage.getItem('memberName');
    const memberEmail = localStorage.getItem('memberEmail');

    if (memberId && memberName) {
      setMemberData({
        id: memberId,
        name: memberName,
        email: memberEmail || '',
      });
    }
  }, [pathname]);

  // Close the More sheet whenever the route changes.
  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  // Lock body scroll while the More sheet is open.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isMoreOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [isMoreOpen]);

  const handleLogout = () => {
    localStorage.removeItem('memberId');
    localStorage.removeItem('memberName');
    localStorage.removeItem('memberEmail');
    setMemberData(null);
    router.push('/');
  };

  const isInMemberPortal = pathname?.startsWith('/member');
  const isInGymPortal = isGymPortalPath(pathname);
  const gymDashboard = pathname?.match(/^\/gym\/[^/]+\/dashboard$/)?.[0];
  const gymNavigation: NavItem[] = gymDashboard
    ? [
      { name: 'Gym dashboard', label: 'Dashboard', href: gymDashboard, icon: LayoutDashboard },
      { name: 'Gym portal', label: 'Your gyms', href: '/gym', icon: UserCog },
    ]
    : [{ name: 'Gym portal', label: 'Your gyms', href: pathname?.startsWith('/admin/gyms') ? '/admin/gyms' : '/gym', icon: LayoutDashboard }];
  const navigation =
    isInGymPortal ? gymNavigation : isInMemberPortal || memberData ? memberNavigation : adminNavigation;
  const primaryHrefs =
    isInGymPortal ? gymNavigation.map(item => item.href) : isInMemberPortal || memberData ? memberPrimaryHrefs : adminPrimaryHrefs;

  // Preserve the original navigation order when picking primary items.
  const primaryItems = navigation.filter((n) => primaryHrefs.includes(n.href));
  const overflowItems = navigation.filter((n) => !primaryHrefs.includes(n.href));

  // The More tab is "active" when on any overflow route or when the sheet is open.
  const isMoreTabActive =
    isMoreOpen ||
    overflowItems.some((item) => isItemActive(item, pathname ?? null));

  return (
    <>
      {/* ---- Desktop sidebar (lg and up) ---- */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-24 flex-col
          backdrop-blur-2xl bg-gradient-to-b from-thrivv-bg-darker/90 via-thrivv-bg-darker/80 to-thrivv-bg-darker/90
          text-white"
        aria-label={isInGymPortal ? 'Gym portal navigation' : 'Primary navigation'}
      >
        {/* Right-edge gold gradient line — primary blade accent */}
        <div
          className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-transparent via-thrivv-gold-500/40 to-transparent pointer-events-none"
          aria-hidden
        />
        {/* Inner-left soft gold rim — adds depth to the chrome */}
        <div
          className="absolute top-1/4 bottom-1/4 left-0 w-px bg-gradient-to-b from-transparent via-thrivv-gold-500/15 to-transparent pointer-events-none"
          aria-hidden
        />
        {/* Top + bottom feathered fades */}
        <div
          className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-thrivv-bg-darker/60 to-transparent pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-thrivv-bg-darker/60 to-transparent pointer-events-none"
          aria-hidden
        />

        <div className="flex flex-col h-full relative">
          {/* Logo */}
          <div className="relative flex items-center justify-center h-24 px-3">
            <div
              className="absolute inset-x-4 inset-y-3 bg-thrivv-gold-500/10 blur-2xl rounded-full pointer-events-none"
              aria-hidden
            />
            <div className="relative">
              <Logo
                variant="gold"
                size="md"
                linkTo={isInGymPortal ? '/gym' : memberData ? '/member/dashboard' : '/'}
              />
            </div>
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/40 to-transparent"
              aria-hidden
            />
          </div>

          {isInGymPortal && <p className="px-2 text-center text-[10px] uppercase tracking-widest text-thrivv-gold-500">Gym portal</p>}
          {/* Member Avatar (if logged in) */}
          {memberData && (
            <div className="relative px-3 py-4">
              <div className="relative w-10 h-10 mx-auto group/avatar">
                <div
                  className="absolute -inset-1 bg-thrivv-gold-500/20 blur-md rounded-2xl pointer-events-none"
                  aria-hidden
                />
                <div
                  className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-thrivv-gold-500 to-thrivv-gold-400 flex items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/avatar:scale-105 shadow-[0_4px_18px_rgba(255,208,0,0.28)]"
                  title={memberData.name}
                >
                  <User className="w-4 h-4 text-black" />
                </div>
              </div>
              <div
                className="mt-4 mx-auto w-10 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/25 to-transparent"
                aria-hidden
              />
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-5 space-y-0.5 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = isItemActive(item, pathname ?? null);
              const Icon = item.icon;
              const displayLabel = item.label;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    relative flex flex-col items-center justify-center py-2.5 px-2 rounded-xl group overflow-hidden
                    transition-[background,transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                    border
                    ${
                      isActive
                        ? 'bg-gradient-to-b from-thrivv-gold-500 to-thrivv-gold-400 border-thrivv-gold-400/30 shadow-[0_4px_20px_rgba(255,208,0,0.35)]'
                        : 'border-transparent hover:border-thrivv-gold-500/15 hover:bg-gradient-to-b hover:from-thrivv-gold-500/[0.08] hover:to-thrivv-gold-500/[0.02] hover:scale-[1.01]'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {!isActive && (
                    <span
                      className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-0 bg-thrivv-gold-500/60 rounded-r-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:h-5"
                      aria-hidden
                    />
                  )}

                  <Icon
                    className={`w-[1.35rem] h-[1.35rem] mb-1.5 transition-[color,transform] duration-500 ${
                      isActive
                        ? 'text-black'
                        : 'text-thrivv-text-muted group-hover:text-thrivv-gold-500 group-hover:scale-105'
                    }`}
                  />
                  <span
                    className={`text-[10.5px] font-medium text-center leading-tight truncate w-full transition-colors duration-500 ${
                      isActive
                        ? 'text-black'
                        : 'text-thrivv-text-muted group-hover:text-thrivv-gold-500'
                    }`}
                  >
                    {displayLabel}
                  </span>

                  {isActive && (
                    <span
                      className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-7 bg-thrivv-gold-300 rounded-r-full shadow-[0_0_10px_rgba(255,208,0,0.5)]"
                      aria-hidden
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="relative px-2 py-4">
            <div
              className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/20 to-transparent"
              aria-hidden
            />
            {memberData ? (
              <button
                onClick={handleLogout}
                className="
                  w-full relative flex flex-col items-center justify-center py-2.5 rounded-xl group overflow-hidden border border-transparent
                  transition-[background,transform,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                  text-thrivv-text-muted hover:text-red-400
                  hover:border-red-500/30
                  hover:bg-gradient-to-b hover:from-red-500/[0.12] hover:to-red-500/[0.04]
                  hover:scale-[1.01]
                "
              >
                <LogOut className="w-[1.35rem] h-[1.35rem] mb-1.5 transition-transform duration-500 group-hover:scale-105" />
                <span className="text-[10.5px] font-medium">Sign Out</span>
              </button>
            ) : (
              !isInMemberPortal && (
                <Link
                    href={isInGymPortal ? '/member/login?portal=gym&redirect=%2Fgym' : '/member/login'}
                  className="
                    w-full relative flex flex-col items-center justify-center py-2.5 rounded-xl group overflow-hidden border border-transparent
                    transition-[background,transform,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                    text-thrivv-text-muted hover:text-thrivv-gold-500
                    hover:border-thrivv-gold-500/20
                    hover:bg-gradient-to-b hover:from-thrivv-gold-500/[0.08] hover:to-thrivv-gold-500/[0.02]
                    hover:scale-[1.01]
                  "
                >
                  <LogIn className="w-[1.35rem] h-[1.35rem] mb-1.5 transition-transform duration-500 group-hover:scale-105" />
                  <span className="text-[10.5px] font-medium">Sign In</span>
                </Link>
              )
            )}
          </div>
        </div>
      </aside>

      {/* ---- Mobile bottom nav (below lg) ---- */}
      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-40 px-3 pt-2 pb-safe pointer-events-none"
        aria-label={isInGymPortal ? 'Gym portal navigation' : 'Primary navigation'}
      >
        <div
          className="
            pointer-events-auto mx-auto max-w-md
            backdrop-blur-2xl bg-thrivv-bg-darker/85
            border border-thrivv-gold-500/20
            rounded-2xl
            shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,208,0,0.04)]
            relative overflow-hidden
          "
        >
          {/* Top gold-gradient hairline */}
          <div
            className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/40 to-transparent"
            aria-hidden
          />

          <div className={`relative grid ${isInGymPortal ? primaryItems.length === 2 ? 'grid-cols-3' : 'grid-cols-2' : 'grid-cols-5'} items-stretch`}>
            {primaryItems.map((item) => {
              const isActive = isItemActive(item, pathname ?? null);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="
                    relative flex flex-col items-center justify-center
                    min-h-[58px] py-2 px-1 group
                    transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                    active:scale-95
                  "
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                >
                  {/* Active gold halo behind the icon */}
                  {isActive && (
                    <span
                      className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-12 bg-thrivv-gold-500/25 rounded-full blur-xl pointer-events-none"
                      aria-hidden
                    />
                  )}
                  <Icon
                    className={`relative w-6 h-6 mb-0.5 transition-[color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isActive
                        ? 'text-thrivv-gold-500 scale-105'
                        : 'text-thrivv-text-muted group-active:text-thrivv-gold-500'
                    }`}
                  />
                  <span
                    className={`relative text-[10px] font-medium leading-tight truncate w-full text-center transition-colors duration-500 ${
                      isActive
                        ? 'text-thrivv-gold-500'
                        : 'text-thrivv-text-muted'
                    }`}
                  >
                    {item.label}
                  </span>
                  {/* Active dot */}
                  {isActive && (
                    <span
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-thrivv-gold-500 rounded-full shadow-[0_0_8px_rgba(255,208,0,0.7)]"
                      aria-hidden
                    />
                  )}
                </Link>
              );
            })}

            {/* More tab */}
            <button
              type="button"
              onClick={() => setIsMoreOpen(true)}
              aria-expanded={isMoreOpen}
              aria-haspopup="dialog"
              aria-label="More navigation options"
              className="
                relative flex flex-col items-center justify-center
                min-h-[58px] py-2 px-1 group
                transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                active:scale-95
              "
            >
              {isMoreTabActive && (
                <span
                  className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-12 bg-thrivv-gold-500/25 rounded-full blur-xl pointer-events-none"
                  aria-hidden
                />
              )}
              <MoreHorizontal
                className={`relative w-6 h-6 mb-0.5 transition-[color,transform] duration-500 ${
                  isMoreTabActive
                    ? 'text-thrivv-gold-500 scale-105'
                    : 'text-thrivv-text-muted group-active:text-thrivv-gold-500'
                }`}
              />
              <span
                className={`relative text-[10px] font-medium leading-tight transition-colors duration-500 ${
                  isMoreTabActive
                    ? 'text-thrivv-gold-500'
                    : 'text-thrivv-text-muted'
                }`}
              >
                More
              </span>
              {isMoreTabActive && (
                <span
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-thrivv-gold-500 rounded-full shadow-[0_0_8px_rgba(255,208,0,0.7)]"
                  aria-hidden
                />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ---- Mobile More sheet ---- */}
      {/* Backdrop */}
      <div
        onClick={() => setIsMoreOpen(false)}
        aria-hidden
        className={`
          lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm
          transition-opacity duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${
            isMoreOpen
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
          }
        `}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="More navigation"
        className={`
          lg:hidden fixed inset-x-0 bottom-0 z-50
          backdrop-blur-2xl bg-thrivv-bg-darker/95
          border-t border-thrivv-gold-500/20
          rounded-t-3xl
          shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.6)]
          pb-safe
          transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${isMoreOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Top hairline */}
        <div
          className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/40 to-transparent"
          aria-hidden
        />

        {/* iOS-style handle */}
        <div className="flex justify-center pt-3 pb-1">
          <span
            className="w-10 h-1 rounded-full bg-thrivv-gold-500/30"
            aria-hidden
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-2 pb-4">
          <div>
            <span className="block text-[10px] uppercase tracking-[0.28em] text-thrivv-gold-500 mb-1">
              Navigation
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-thrivv-text-primary">
              More
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsMoreOpen(false)}
            aria-label="Close more navigation"
            className="w-10 h-10 rounded-full border border-thrivv-gold-500/15 bg-thrivv-bg-card/60 flex items-center justify-center text-thrivv-text-muted hover:text-thrivv-gold-500 hover:border-thrivv-gold-500/40 transition-colors duration-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Overflow grid */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-2">
            {overflowItems.map((item) => {
              const isActive = isItemActive(item, pathname ?? null);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    relative flex flex-col items-center justify-center
                    min-h-[88px] py-4 px-2 rounded-2xl
                    transition-[background,transform,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                    border active:scale-95
                    ${
                      isActive
                        ? 'border-thrivv-gold-500/30 bg-gradient-to-b from-thrivv-gold-500/[0.12] to-thrivv-gold-500/[0.02]'
                        : 'border-thrivv-gold-500/10 bg-thrivv-bg-card/50'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    className={`w-6 h-6 mb-2 ${
                      isActive
                        ? 'text-thrivv-gold-500'
                        : 'text-thrivv-text-secondary'
                    }`}
                  />
                  <span
                    className={`text-xs font-medium text-center leading-tight ${
                      isActive
                        ? 'text-thrivv-gold-500'
                        : 'text-thrivv-text-primary'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Sign Out / Sign In footer */}
        <div className="px-4 pt-3 pb-5 border-t border-thrivv-gold-500/10">
          {memberData ? (
            <button
              onClick={() => {
                setIsMoreOpen(false);
                handleLogout();
              }}
              className="
                w-full inline-flex items-center justify-center gap-2
                min-h-[52px] rounded-2xl px-5
                border border-red-500/20 bg-red-500/5 text-red-400
                hover:border-red-500/40 hover:bg-red-500/10
                transition-colors duration-300 text-sm font-medium
                active:scale-[0.99]
              "
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          ) : (
            !isInMemberPortal && (
              <Link
                href={isInGymPortal ? '/member/login?portal=gym&redirect=%2Fgym' : '/member/login'}
                className="
                  w-full inline-flex items-center justify-center gap-2
                  min-h-[52px] rounded-2xl px-5
                  border border-thrivv-gold-500/20 bg-thrivv-gold-500/5 text-thrivv-gold-500
                  hover:border-thrivv-gold-500/40 hover:bg-thrivv-gold-500/10
                  transition-colors duration-300 text-sm font-medium
                  active:scale-[0.99]
                "
              >
                <LogIn className="w-4 h-4" />
                Sign in
              </Link>
            )
          )}
        </div>
      </div>
    </>
  );
}
