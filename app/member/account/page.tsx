import WorkspaceLink from '@/components/WorkspaceLink';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import DeleteAccount from '@/components/DeleteAccount';
import AccountPreferences from '@/components/AccountPreferences';
import { Activity, ArrowUpRight, HelpCircle } from 'lucide-react';
import MemberPageHeader from '@/components/MemberPageHeader';
export const dynamic = 'force-dynamic';
export default async function AccountPage() {
  let user;
  try { user = await requireAuth(); } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') redirect('/member/login?redirect=/member/account');
    return <main className="p-8"><p role="alert">Your account is temporarily unavailable. Please refresh to retry.</p></main>;
  }
  const { data, error } = await supabase.from('users').select('first_name,last_name,email,gym_id,is_admin').eq('id', user.id).single();
  if (error) return <main className="p-8"><p role="alert">Unable to load your account. Please refresh to retry.</p></main>;
  const result = data.gym_id ? await supabase.from('gyms').select('name').eq('id', data.gym_id).single() : null;
  return <main className="member-future mx-auto max-w-5xl p-4 sm:p-8 space-y-6">
    <MemberPageHeader section="account" title="Your account" subtitle="Your details, gym and preferences. One place to manage it all." />
    <section className="dark-card p-6 sm:p-8 space-y-6">
      <h2 className="text-xl font-semibold">Personal details</h2>
      <dl className="grid gap-6 sm:grid-cols-2">
        <div><dt className="text-sm text-gray-400">Name</dt><dd className="mt-2 text-lg break-words">{[data.first_name, data.last_name].filter(Boolean).join(' ')}</dd></div>
        <div><dt className="text-sm text-gray-400">Email address</dt><dd className="mt-2 text-lg break-all">{data.email}</dd></div>
      </dl>
    </section>
    <section className="dark-card p-6 sm:p-8 space-y-4">
      <h2 className="text-xl font-semibold">Your gym</h2>
      {result?.error ? <p role="alert">Unable to load your gym. Please refresh to retry.</p> : data.gym_id ? <><p className="text-2xl text-thrivv-gold-500">{result?.data?.name}</p><Link href="/member/dashboard" className="inline-block underline underline-offset-4">View your gym leaderboard →</Link></> : <><p className="text-gray-400">Join your gym to share a leaderboard with its members.</p><Link href="/member/account/join-gym" className="inline-block rounded-xl bg-thrivv-gold-500 px-6 py-3 font-semibold text-black">Join a gym</Link></>}
    </section>
    <div className="grid gap-4 sm:grid-cols-2">
      <Link href="/member/wearables" className="dark-card group flex items-center gap-4 p-5"><Activity className="text-thrivv-gold-500" /><div className="flex-1"><h2 className="font-semibold">Wearables</h2><p className="mt-1 text-sm text-gray-400">Connect and manage WHOOP</p></div><ArrowUpRight size={18} className="text-gray-400 group-hover:text-thrivv-gold-500" /></Link>
      <Link href="/member/account/support" className="dark-card group flex items-center gap-4 p-5"><HelpCircle className="text-thrivv-gold-500" /><div className="flex-1"><h2 className="font-semibold">Help & support</h2><p className="mt-1 text-sm text-gray-400">Talk to the Thrivv team</p></div><ArrowUpRight size={18} className="text-gray-400 group-hover:text-thrivv-gold-500" /></Link>
    </div>
    <section id="preferences" className="dark-card scroll-mt-24 p-6 sm:p-8 space-y-4"><h2 className="text-xl font-semibold">Preferences</h2><AccountPreferences /></section>
    <DeleteAccount memberId={user.id} />
    {data.is_admin && <section className="dark-card p-6 sm:p-8"><WorkspaceLink className="text-thrivv-gold-500 underline" href="/admin/gyms">Switch to Platform Admin</WorkspaceLink></section>}
  </main>;
}
