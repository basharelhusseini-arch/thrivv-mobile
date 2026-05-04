'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MemberClassesRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/member/bookings');
  }, [router]);
  
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center animate-pulse">
          <span className="w-2 h-2 rounded-full bg-thrivv-gold-500" />
        </div>
        <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">
          Redirecting to bookings
        </span>
      </div>
    </div>
  );
}
