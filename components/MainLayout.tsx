'use client';

import { ReactNode, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import BackgroundLayers from './BackgroundLayers';

export default function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const memberId = localStorage.getItem('memberId');
        setIsAuthenticated(!!memberId);
      }
      setIsLoading(false);
    };

    checkAuth();
    checkAuth();
  }, [pathname]);

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

  const showSidebar = isAuthenticated && !isPublicAuthPage && isProtectedRoute;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-thrivv-bg-darker text-thrivv-text-primary relative overflow-hidden">
        <BackgroundLayers />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center animate-pulse">
              <span className="w-2 h-2 rounded-full bg-thrivv-gold-500" />
            </div>
            <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">
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
  return (
    <div className="min-h-screen bg-thrivv-bg-darker text-thrivv-text-primary relative overflow-x-hidden">
      <BackgroundLayers />

      <Sidebar />

      <main className="relative z-10 lg:ml-24 px-5 sm:px-8 lg:px-12 py-8 lg:py-10 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
