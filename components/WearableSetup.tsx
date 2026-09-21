'use client';
import { useTranslation } from '@/lib/i18n/client';

import { useEffect, useRef, useState } from 'react';
import { Activity, QrCode, Watch } from 'lucide-react';
import Logo from './Logo';

type Choice = 'whoop' | 'none' | 'other';
export default function WearableSetup({ userId }: { userId: string }) {
  const { t, locale } = useTranslation();
  const [state, setState] = useState<'loading' | 'ready' | 'saving' | 'complete' | 'error'>('loading');
  const [choice, setChoice] = useState<Choice | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    setState('loading');
    const timer = setTimeout(() => { setState('error'); controller.abort(); }, 10000);
    Promise.all(['/api/health/profile', '/api/whoop/status'].map(async url => {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Unable to check your wearable setup.');
      return response.json();
    })).then(([profile, whoop]) => {
      if (!controller.signal.aborted) setState(profile.exists || whoop.connected ? 'complete' : 'ready');
    }).catch(() => { if (!controller.signal.aborted) setState('error'); }).finally(() => clearTimeout(timer));
    return () => { mounted.current = false; controller.abort(); clearTimeout(timer); };
  }, [userId, retry]);
  useEffect(() => {
    if ((state === 'ready' || state === 'saving') && !dialog.current?.open) dialog.current?.showModal();
  }, [state]);

  async function save() {
    if (!choice || state === 'saving') return;
    setState('saving'); setError('');
    try {
      const response = await fetch('/api/health/profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: 'general', has_wearable: choice !== 'none', wearable_type: choice === 'none' ? null : choice }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Your choice could not be saved. Please try again.');
      if (!mounted.current) return;
      dialog.current?.close(); setState('complete');
      window.dispatchEvent(new Event('thrivv:workouts-synced'));
      window.location.assign('/member/dashboard');
    } catch (e) { if (mounted.current) { setError(e instanceof Error ? e.message : 'Unable to save.'); setState('ready'); } }
  }
  if (state === 'loading' || state === 'complete') return null;
  if (state === 'error') return <p role="alert" className="mb-6 rounded-xl border border-thrivv-gold-500/20 p-4 text-sm text-thrivv-text-secondary">{t("Wearable setup is temporarily unavailable.")} <button onClick={() => setRetry(value => value + 1)} className="text-thrivv-gold-500 underline">{t("Retry setup")}</button></p>;
  const choices: { value: Choice; title: string; description: string; icon: typeof Watch }[] = [
    { value: 'whoop', title: 'I use WHOOP', description: 'Scan at your gym to earn points. Connect WHOOP whenever you want.', icon: Activity },
    { value: 'none', title: 'No wearable', description: 'Verify your workout by scanning your gym’s QR.', icon: QrCode },
    { value: 'other', title: 'Another wearable', description: 'Apple Watch, Garmin or another device.', icon: Watch },
  ];
  return <dialog ref={dialog} onCancel={event => event.preventDefault()} aria-labelledby="wearable-setup-title" className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-3xl border border-thrivv-gold-500/25 bg-[#0D0F14] p-6 text-white shadow-2xl backdrop:bg-black/80 sm:p-8">
    <div className="text-center"><Logo size="md" /><h2 id="wearable-setup-title" className="mt-6 text-2xl font-semibold">{t("How do you track your workouts?")}</h2><p className="mt-3 text-sm text-thrivv-text-secondary">{t("Join your gym → scan its QR after training → earn points. WHOOP is optional.")}</p></div>
    <fieldset disabled={state === 'saving'} className="mt-7 space-y-3"><legend className="sr-only">{t("Your wearable")}</legend>{choices.map(({ value, title, description, icon: Icon }) => <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${choice === value ? 'border-thrivv-gold-500 bg-thrivv-gold-500/10' : 'border-white/10'}`}>
      <input type="radio" name="wearable" value={value} checked={choice === value} onChange={() => setChoice(value)} className="h-4 w-4 shrink-0" /><Icon size={20} className="shrink-0 text-thrivv-gold-500" /><span><span className="block text-sm font-semibold">{t(title)}</span><span className="mt-1 block text-xs leading-relaxed text-thrivv-text-secondary">{t(description)}</span></span>
    </label>)}</fieldset>
    {choice === 'other' && <p className="mt-4 text-sm leading-relaxed text-thrivv-text-secondary">{t("Only WHOOP connects today. Use gym QR verification for now; other wearable integrations are coming later.")}</p>}
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{t(error)}</p>}
    <button disabled={!choice || state === 'saving'} onClick={() => void save()} className="btn-primary mt-6 min-h-[52px] w-full px-6 py-3 disabled:opacity-50">{state === 'saving' ? t("Saving…") : t("Continue to Thrivv")}</button>
  </dialog>;
}
