'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  Calendar,
  UserCog,
  Menu,
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
  { name: 'Recipes', label: 'Recipes', href: '/member/recipes', icon: ChefHat },
  { name: 'Bookings', label: 'Bookings', href: '/member/bookings', icon: Calendar },
  { name: 'Health Score', label: 'Health', href: '/member/health', icon: Activity },
  { name: 'Habits', label: 'Habits', href: '/member/habits', icon: Target },
  { name: 'Rewards', label: 'Rewards', href: '/member/rewards', icon: Trophy },
  { name: 'Wearables', label: 'Wearables', href: '/member/wearables', icon: Heart },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [memberData, setMemberData] = useState<{ id: string; name: string; email: string } | null>(null);

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

  const handleLogout = () => {
    localStorage.removeItem('memberId');
    localStorage.removeItem('memberName');
    localStorage.removeItem('memberEmail');
    setMemberData(null);
    router.push('/');
  };

  const isInMemberPortal = pathname?.startsWith('/member');
  const navigation = isInMemberPortal || memberData ? memberNavigation : adminNavigation;

  return (
    <>
      {/* Mobile menu button — glass + gold rim, matches sidebar surface */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2.5 rounded-xl backdrop-blur-xl bg-thrivv-bg-darker/80 border border-thrivv-gold-500/30 text-thrivv-gold-500 shadow-[0_8px_30px_rgba(255,208,0,0.18)] hover:scale-105 hover:border-thrivv-gold-500/60 transition-all duration-300"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-24 lg:w-24
          backdrop-blur-2xl
          bg-gradient-to-b from-thrivv-bg-darker/90 via-thrivv-bg-darker/80 to-thrivv-bg-darker/90
          text-white transform
          transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
        aria-label="Primary navigation"
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
        {/* Top + bottom feathered fades so the sidebar melts into the canvas */}
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
              <Logo variant="gold" size="md" linkTo={memberData ? '/member/dashboard' : '/'} />
            </div>
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/40 to-transparent"
              aria-hidden
            />
          </div>

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
              const isActive =
                pathname === item.href ||
                (item.href === '/member/bookings' && pathname === '/member/classes');
              const Icon = item.icon;
              const displayLabel = item.label;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
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
                  {/* Hover left-edge accent — only visible on inactive items */}
                  {!isActive && (
                    <span
                      className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-0 bg-thrivv-gold-500/60 rounded-r-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:h-5"
                      aria-hidden
                    />
                  )}

                  <Icon
                    className={`w-5 h-5 mb-1.5 transition-[color,transform] duration-500 ${
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

                  {/* Active left-edge bar — slim and softly glowing */}
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
                  w-full relative flex flex-col items-center justify-center py-3 rounded-2xl group overflow-hidden border border-transparent
                  transition-[background,transform,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                  text-thrivv-text-muted hover:text-red-400
                  hover:border-red-500/30
                  hover:bg-gradient-to-b hover:from-red-500/[0.12] hover:to-red-500/[0.04]
                  hover:scale-[1.015]
                "
              >
                <LogOut className="w-5 h-5 mb-1.5 transition-transform duration-500 group-hover:scale-105" />
                <span className="text-[11px] font-medium">Sign Out</span>
              </button>
            ) : (
              !isInMemberPortal && (
                <Link
                  href="/member/login"
                  className="
                    w-full relative flex flex-col items-center justify-center py-3 rounded-2xl group overflow-hidden border border-transparent
                    transition-[background,transform,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                    text-thrivv-text-muted hover:text-thrivv-gold-500
                    hover:border-thrivv-gold-500/20
                    hover:bg-gradient-to-b hover:from-thrivv-gold-500/[0.12] hover:to-thrivv-gold-500/[0.04]
                    hover:scale-[1.015]
                  "
                >
                  <LogIn className="w-5 h-5 mb-1.5 transition-transform duration-500 group-hover:scale-105" />
                  <span className="text-[11px] font-medium">Sign In</span>
                </Link>
              )
            )}
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden
        />
      )}
    </>
  );
}
