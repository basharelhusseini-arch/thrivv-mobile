'use client';
import { useTranslation } from '@/lib/i18n/client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MemberPageHeader from '@/components/MemberPageHeader';
import { ensureWhoopAutoSync } from '@/lib/whoop/auto-sync';
export default function JoinGymPage() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [code, setCode] = useState(''); const [error, setError] = useState('');
  const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false);
  const [gym, setGym] = useState<{ name: string } | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/api/account', { cache: 'no-store' }).then(async res => {
      if (res.status === 401) { router.replace('/member/login?redirect=/member/account/join-gym'); return; }
      if (!res.ok) throw new Error('Unable to load account. Refresh to retry.');
      const data = await res.json(); if (live) { setGym(data.gym); setReady(true); }
    }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [router]);
  async function join(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      const res = await fetch('/api/account/join-gym', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      if (res.status === 401) { router.replace('/member/login?redirect=/member/account/join-gym'); return; }
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Unable to join gym');
      setGym(data.gym); setCode(''); router.refresh();
      void ensureWhoopAutoSync({ force: true });
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to join gym. Please retry.'); }
    finally { setBusy(false); }
  }
  return <main className="member-future mx-auto max-w-3xl p-4 sm:p-8 space-y-6">
    <MemberPageHeader section="account" title={t("Join your gym")} subtitle={t("Enter the code shared by your gym to join its community.")} />
    <section className="dark-card p-6 sm:p-8 space-y-5">
      {error && <p role="alert" className="text-red-400">{t(error)}</p>}
      {!ready && !error && <p role="status">{t("Loading your account…")}</p>}
      {gym ? <div role="status" className="space-y-4"><h2 className="text-2xl text-thrivv-gold-500">{t("You’re part of")} {gym.name}</h2><p>{t("Your gym leaderboard ranks members by reward points earned this week.")}</p><Link href="/member/dashboard" className="inline-block rounded-xl bg-thrivv-gold-500 px-6 py-3 text-black font-semibold">{t("Open dashboard")}</Link></div> : ready && <form onSubmit={join} className="space-y-5">
        <label htmlFor="gym-code" className="block font-medium">{t("Gym code")}</label>
        <input id="gym-code" dir="ltr" value={code} onChange={e => setCode(e.target.value)} required maxLength={40} autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={busy} aria-describedby="gym-code-help" className="w-full rounded-xl border border-yellow-500/30 bg-black/30 px-4 py-4 text-lg tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-yellow-400" placeholder="XXXX-XXXX-XXXX-XXXX" />
        <p id="gym-code-help" className="text-sm text-gray-400">{t("Ask your gym for its code. Entering a valid code joins you immediately.")}</p>
        <button disabled={busy || !code.trim()} className="rounded-xl bg-thrivv-gold-500 px-6 py-3 text-black font-semibold disabled:opacity-50">{busy ? t("Joining…") : t("Join gym")}</button>
      </form>}
      <Link href="/member/account" className="block text-gray-400 underline underline-offset-4">{t("Back to account")}</Link>
    </section>
  </main>;
}
