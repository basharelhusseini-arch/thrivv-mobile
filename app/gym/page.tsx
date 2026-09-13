import GymAccessRequest from '@/components/GymAccessRequest';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { gymPortalAccess } from '@/lib/gym-auth';
import { gymDestination, gymLoginPath } from '@/lib/gym-routing';

export const dynamic = 'force-dynamic';
export default async function GymPortal() {
  const access = await gymPortalAccess();
  if (!access.user) redirect(gymLoginPath());
  const destination = gymDestination(access.isAdmin, access.gyms);
  if (!access.error && destination) redirect(destination);
  return <main className="min-h-screen bg-thrivv-bg-darker flex items-center justify-center px-6 py-12">
    <section className="glass-card w-full max-w-xl p-8 space-y-6">
      <p className="text-xs uppercase tracking-[0.28em] text-thrivv-gold-500">Thrivv / Gym portal</p>
      <h1 className="text-4xl font-semibold tracking-tighter">{access.error ? 'Unable to load your gyms' : access.gyms.length ? 'Choose your gym' : 'Gym access needed'}</h1>
      {access.error ? <><p role="alert" className="text-thrivv-text-secondary">{access.error}</p><a href="/gym" className="btn-primary inline-block px-5 py-3">Retry</a></> : access.gyms.length ? <ul className="space-y-3">{access.gyms.map(gym => <li key={gym.id}><Link href={`/gym/${gym.id}/dashboard`} className="btn-ghost block px-5 py-4">{gym.name} →</Link></li>)}</ul> : <p className="text-thrivv-text-secondary">Your account has not been assigned a gym dashboard. Ask Thrivv to grant access to your account. A member joining code does not grant dashboard access.</p>}
      {!access.error && !access.gyms.length && <GymAccessRequest />}
      <Link href="/gym/support" className="block text-sm text-thrivv-gold-500 underline">Help & Support</Link>
      <Link href="/member/dashboard" className="block text-sm text-thrivv-gold-500 underline">Open member dashboard</Link>
    </section>
  </main>;
}
