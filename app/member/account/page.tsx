import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import MemberPageHeader from '@/components/MemberPageHeader';
export const dynamic = 'force-dynamic';
export default async function AccountPage() {
  let user;
  try { user = await requireAuth(); } catch { redirect('/member/login?redirect=/member/account'); }
  const { data, error } = await supabase.from('users').select('first_name,last_name,email,gym_id,is_admin').eq('id', user.id).single();
  if (error) return <main className="p-8"><p role="alert">Unable to load your account. Please refresh to retry.</p></main>;
  const result = data.gym_id ? await supabase.from('gyms').select('name').eq('id', data.gym_id).single() : null;
  return <main className="member-future mx-auto max-w-5xl p-4 sm:p-8 space-y-6">
    <MemberPageHeader section="account" title="Your account" subtitle="Your profile. Your gym. Your community." />
    <section className="dark-card p-6 sm:p-8 space-y-6">
      <h2 className="text-xl font-semibold">Personal details</h2>
      <dl className="grid gap-6 sm:grid-cols-2">
        <div><dt className="text-sm text-gray-400">Name</dt><dd className="mt-2 text-lg break-words">{[data.first_name, data.last_name].filter(Boolean).join(' ')}</dd></div>
        <div><dt className="text-sm text-gray-400">Email address</dt><dd className="mt-2 text-lg break-all">{data.email}</dd></div>
        <div><dt className="text-sm text-gray-400">Password</dt><dd className="mt-2 text-lg" aria-label="Password hidden">••••••••</dd><p className="text-sm text-gray-400 mt-1">Your password is kept private.</p></div>
      </dl>
    </section>
    <section className="dark-card p-6 sm:p-8 space-y-4">
      <h2 className="text-xl font-semibold">Your gym</h2>
      {result?.error ? <p role="alert">Unable to load your gym. Please refresh to retry.</p> : data.gym_id ? <><p className="text-2xl text-thrivv-gold-500">{result?.data?.name}</p><Link href="/member/dashboard" className="inline-block underline underline-offset-4">View your gym leaderboard →</Link></> : <><p className="text-gray-400">Join your gym to share a leaderboard with its members.</p><Link href="/member/account/join-gym" className="inline-block rounded-xl bg-thrivv-gold-500 px-6 py-3 font-semibold text-black">Join a gym</Link></>}
    </section>
    <section className="dark-card p-6 sm:p-8 space-y-4"><h2 className="text-xl font-semibold">Help & Support</h2><Link className="text-thrivv-gold-500 underline" href="/member/account/support">Send a message to Thrivv</Link></section>
    {data.is_admin && <section className="dark-card p-6 sm:p-8"><Link className="text-thrivv-gold-500 underline" href="/admin/gyms">Open Platform Admin</Link></section>}
  </main>;
}
