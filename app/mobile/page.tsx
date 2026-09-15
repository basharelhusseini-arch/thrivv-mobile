import Link from 'next/link';
import { redirect } from 'next/navigation';
import Logo from '@/components/Logo';
import { getServerSessionIdentity } from '@/lib/server-session-identity';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Welcome to Thrivv', robots: { index: false, follow: false } };

export default async function MobileWelcome() {
  const session = await getServerSessionIdentity();
  if (session.status === 'authenticated') redirect('/member/dashboard');
  return <main className="mobile-welcome flex min-h-[100dvh] flex-col items-center justify-center bg-[#0D0F14] px-8 py-12 text-center">
    <div className="w-full max-w-sm">
      <Logo size="xl" />
      <p className="mt-8 text-xs uppercase tracking-[0.3em] text-thrivv-gold-500">Show up. Make it count.</p>
      <h1 className="mt-6 text-4xl font-semibold tracking-tight text-[#F4F1E8]">Welcome to Thrivv</h1>
      <p className="mt-4 text-base leading-relaxed text-thrivv-text-secondary">Your training. Your progress. Your rewards.</p>
      <Link href="/member/login" className="btn-primary mt-12 flex min-h-[56px] w-full items-center justify-center px-6 py-4 text-base">Sign in</Link>
    </div>
  </main>;
}
