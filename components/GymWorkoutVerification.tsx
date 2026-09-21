'use client';
import { useTranslation } from '@/lib/i18n/client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureWhoopAutoSync } from '@/lib/whoop/auto-sync';
import { CheckCircle2, ScanLine } from 'lucide-react';
import MemberNextAction from '@/components/MemberNextAction';
import type { VerificationStatus } from '@/lib/member-journey';
export type { VerificationStatus } from '@/lib/member-journey';
export default function GymWorkoutVerification({ scanner = false }: { scanner?: boolean }) {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<VerificationStatus | null>(null);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(''); const [running, setRunning] = useState(false); const [busy, setBusy] = useState(false);
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0); const frame = useRef(0); const mounted = useRef(true); const loading = useRef(false);
  const requests = useRef<Record<string, string>>({});
  const requestDate = useRef('');
  const refresh = useCallback(async (): Promise<VerificationStatus | null> => {
    if (loading.current) return null; loading.current = true;
    try {
      const res = await fetch('/api/member/workout-verification', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error('Workout verification status is unavailable. Please retry.');
      const next = await res.json() as VerificationStatus;
      if (requestDate.current !== next.date) { requestDate.current = next.date; requests.current = {}; }
      if (mounted.current) { setData(next); setError(''); } return next;
    } catch (e) { if (mounted.current) { setData(null); setError(e instanceof Error ? e.message : 'Status unavailable'); } return null; }
    finally { loading.current = false; }
  }, []);
  const stop = useCallback(() => {
    generation.current++; cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    if (video.current) video.current.srcObject = null;
    if (mounted.current) setRunning(false);
  }, []);
  useEffect(() => {
    mounted.current = true; void refresh(); void ensureWhoopAutoSync();
    const tick = () => { if (!document.hidden) void refresh(); else stop(); };
    const interval = setInterval(tick, 30000);
    window.addEventListener('thrivv:workouts-synced', tick); document.addEventListener('visibilitychange', tick);
    return () => { mounted.current = false; clearInterval(interval); stop(); window.removeEventListener('thrivv:workouts-synced', tick); document.removeEventListener('visibilitychange', tick); };
  }, [refresh, stop]);
  async function start(workoutId: string) {
    if (navigator.onLine === false) { setError('Connect to the internet to verify attendance. Scans cannot be saved offline.'); return; }
    stop(); setError(''); setMessage(''); setSelected(workoutId);
    const attempt = generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable. Open Thrivv in Safari or Chrome over HTTPS and allow camera access.');
      const camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 } }, audio: false });
      if (generation.current !== attempt || !mounted.current) { camera.getTracks().forEach(t => t.stop()); return; }
      stream.current = camera; if (!video.current) { stop(); return; }
      video.current.srcObject = camera; setRunning(true); await video.current.play();
      const { default: jsQR } = await import('jsqr');
      if (generation.current !== attempt) return;
      setRunning(true);
      const canvas = document.createElement('canvas'); const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Camera processing unavailable');
      let last = 0;
      const scan = (time: number) => {
        if (generation.current !== attempt) return;
        const v = video.current;
        try {
        if (v?.videoWidth && v.videoHeight && time - last > 250) {
          last = time; canvas.width = Math.min(800, v.videoWidth); canvas.height = Math.round(v.videoHeight * canvas.width / v.videoWidth);
          context.drawImage(v, 0, 0, canvas.width, canvas.height);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'dontInvert' });
          if (code?.data.startsWith('thrivv-workout:')) { stop(); void submit(workoutId, code.data); return; }
        }
        } catch { stop(); setError('Camera processing stopped. Tap Scan to retry.'); return; }
        frame.current = requestAnimationFrame(scan);
      };
      frame.current = requestAnimationFrame(scan);
    } catch { if (generation.current === attempt) { stop(); setError('Unable to open camera. Allow camera permission, then tap Scan again. You can also open this page in Safari or Chrome.'); } }
  }
  async function submit(workoutId: string, qr: string) {
    if (navigator.onLine === false) { setError('Connect to the internet and scan again. Attendance needs a live connection.'); return; }
    setBusy(true); setMessage('Verifying your workout…');
    try {
      const res = await fetch('/api/member/workout-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId, qr, requestId: requests.current[workoutId] ||= crypto.randomUUID() }), signal: AbortSignal.timeout(15000) });
      const result = await res.json(); if (!res.ok) throw new Error(result.error || 'Scan not accepted');
      if (mounted.current) setMessage(result.reward?.status === 'credited' ? 'Points credited' : result.reward?.status === 'not_activated' ? 'Gym verified — rewards not activated' : 'Gym verified — score or reward eligibility pending');
      const next = await refresh();
      if (mounted.current && next?.rewardStatus === 'credited') setMessage(`${next.creditedPoints} points earned. Your spendable balance is updated.`);
      window.dispatchEvent(new Event('thrivv:workouts-synced'));
    } catch (e) { if (mounted.current) { setMessage(''); setError(e instanceof Error ? e.message : 'Verification unavailable. Scan again to retry safely.'); } }
    finally { if (mounted.current) setBusy(false); }
  }
  async function syncWhoop() {
    setBusy(true); setError(''); setMessage('Syncing your WHOOP workouts…');
    try {
      const res = await fetch('/api/whoop/sync', { method: 'POST', signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(res.status === 401 ? 'Reconnect WHOOP in Wearables to continue.' : 'WHOOP sync is unavailable. Please try again.');
      const next = await refresh();
      if (mounted.current && next) setMessage(next.workouts.length ? 'WHOOP performance updated. Choose your workout below.' : 'No workouts imported yet. Record a workout in WHOOP, then sync again.');
      window.dispatchEvent(new Event('thrivv:workouts-synced'));
    } catch (e) { if (mounted.current) { setMessage(''); setError(e instanceof Error ? e.message : 'Unable to sync WHOOP.'); } }
    finally { if (mounted.current) setBusy(false); }
  }
  async function logWorkoutAndStart() {
    setBusy(true); setError(''); setMessage('Saving today’s workout…');
    try {
      const currentResponse = await fetch('/api/checkin/today', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!currentResponse.ok) throw new Error('Unable to load today’s check-in. Please retry.');
      const current = await currentResponse.json();
      const checkin = current.checkin || {};
      const saveResponse = await fetch('/api/checkin/today', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          didWorkout: true,
          calories: Number(checkin.calories) || 0,
          sleepHours: Number(checkin.sleep_hours) || 0,
          habits: checkin.habit_details || {},
        }),
        signal: AbortSignal.timeout(15000),
      });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.error || 'Unable to save today’s workout.');
      const next = await refresh();
      if (!next?.manual?.canScan) throw new Error('Workout saved, but QR scanning is not available for this membership. Refresh or check your gym membership.');
      if (mounted.current) setBusy(false);
      await start('manual');
    } catch (e) {
      if (mounted.current) { setMessage(''); setError(e instanceof Error ? e.message : 'Unable to prepare the camera.'); }
    } finally { if (mounted.current) setBusy(false); }
  }
  if (!scanner && data) return <MemberNextAction data={data} />;
  return <section className="mx-auto max-w-3xl space-y-6" aria-label={t("Gym workout verification")}>
    <div className="text-center"><span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-thrivv-gold-500/30 bg-thrivv-gold-500/10"><ScanLine size={26} className="text-thrivv-gold-400" /></span><h1 className="text-3xl font-semibold tracking-tight text-white">{t("Verify your workout.")}</h1><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-thrivv-text-secondary">{t("Use the rotating workout QR displayed at your gym. Your gym joining code is separate.")}</p></div>
    {error && <p role="alert" className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">{t(error)} <button className="underline underline-offset-4" onClick={() => void refresh()}>{t("Refresh status")}</button></p>}
    {message && <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">{t(message)}</p>}
    {!data && !error && <p role="status" className="py-8 text-center text-thrivv-text-secondary">{t("Loading workout status…")}</p>}
    {data && !data.gymId && <MemberNextAction data={data} />}
    {data && data.gymId && !data.verificationEnabled && <p className="rounded-xl border border-white/10 p-5 text-sm text-thrivv-text-secondary">{t("Your gym’s workout verification is not available yet.")}</p>}
    {data?.manual?.eligible && data.gymId && <div className="rounded-3xl border border-thrivv-gold-500/20 bg-gradient-to-br from-thrivv-gold-500/[0.06] to-[#0c0e0d] p-6 sm:p-8">
      {data.manual.verified ? <div className="text-center"><CheckCircle2 className="mx-auto mb-4 text-emerald-400" size={36} /><h2 className="text-2xl font-semibold text-white">{data.rewardStatus === 'credited' ? t("{0} points earned", { 0: data.creditedPoints }) : t("Workout verified")}</h2><p className="mt-3 text-sm text-thrivv-text-secondary">{data.rewardStatus === 'credited' ? t("Today’s workout is complete and your points are in your spendable balance.") : t("Your gym visit is recorded. Check Rewards for the latest credit status.")}</p><Link href="/member/rewards" className="btn-primary mt-6 inline-flex px-6 py-3">{t("View rewards")}</Link><Link href="/member/checkin" className="mt-4 block text-sm text-thrivv-gold-400">{t("Update today’s habits")}</Link></div> : <>
        <p className="text-[11px] uppercase tracking-[0.2em] text-thrivv-gold-400">{t("Today’s workout")}</p><h2 className="mt-3 text-2xl font-semibold text-white">{t("Scan your gym QR.")}</h2><p className="mt-3 text-sm leading-relaxed text-thrivv-text-secondary">{t("Earn 40 spendable points after verification, plus up to 10 habit points. Maximum 50 per day. Repeated scans do not add another workout reward.")}</p>
        {!data.manual.checkedIn && data.manual.enabled && <button disabled={busy || running} onClick={() => void logWorkoutAndStart()} className="btn-primary mt-6 flex w-full items-center justify-center gap-2 px-5 py-3.5 disabled:opacity-50"><ScanLine size={18} />{busy ? t("Preparing your workout…") : t("Scan gym QR")}</button>}
        {data.manual.canScan && <button disabled={busy || running} onClick={() => void start('manual')} className="btn-primary mt-6 flex w-full items-center justify-center gap-2 px-5 py-3.5 disabled:opacity-50"><ScanLine size={18} />{running ? t("Camera is open") : t("Scan gym QR")}</button>}
        {!data.manual.enabled && <p className="mt-4 text-sm text-thrivv-text-muted">{t("Gym reward verification is not available right now.")}</p>}
        {data.manual.checkedIn && data.manual.enabled && !data.manual.canScan && <p className="mt-4 text-sm text-thrivv-text-muted">{t("Workout saved.")} <Link href="/member/account" className="text-thrivv-gold-400 underline">{t("Check your membership")}</Link> {t("to see why scanning is unavailable.")}</p>}
      </>}
    </div>}
    {data?.whoopConnected && <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-6"><h2 className="font-semibold text-white">{t("Your WHOOP workouts")}</h2><p className="mt-2 text-sm text-thrivv-text-secondary">{t("Optional performance insights. Everyone earns the same attendance points using the scan above; WHOOP syncing does not add another reward.")}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs text-thrivv-text-secondary">{t("Today’s Health Score")}</p><p className="mt-1 text-3xl font-semibold text-thrivv-gold-500">{data.score === null ? '—' : data.score.toFixed(1)}<span className="ms-1 text-xs font-normal text-thrivv-text-muted">/110</span></p></div><button disabled={busy || running} onClick={() => void syncWhoop()} className="btn-primary px-5 py-3 disabled:opacity-50">{busy ? t("Please wait…") : t("Sync workouts")}</button></div>
      {!data.workouts.length && <div className="mt-5 text-sm text-thrivv-text-muted">{t("Your imported workouts will appear here. Record your workout in WHOOP, then tap Sync workouts.")} <Link href="/member/wearables" className="text-thrivv-gold-400 underline">{t("Manage connection")}</Link></div>}
      {data.workouts.map(workout => <div key={workout.id} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4"><div><h3 className="text-sm font-medium text-white">{workout.sport_name || t("WHOOP workout")}</h3><p className="mt-1 text-xs text-thrivv-text-muted">{workout.date} · {workout.status}</p><p className="mt-2 text-sm text-thrivv-gold-500">{t("Workout score")} {workout.workout_score == null ? t("pending") : workout.workout_score.toFixed(1)}{workout.end_at && t(" · {0} min", { 0: Math.max(0, Math.round((Date.parse(workout.end_at) - Date.parse(workout.start_at)) / 60000)) })}</p></div>{workout.verified && <span className="flex items-center gap-1.5 text-xs text-emerald-400"><CheckCircle2 size={14} />{t("Verified")}</span>}</div>)}
    </div>}
    <div className={running ? 'rounded-2xl border border-thrivv-gold-500/30 bg-black p-3 space-y-3' : 'hidden'}><p className="px-2 text-sm text-thrivv-text-secondary">{t("Point your camera at your gym’s current workout QR. Camera images stay on your device.")}</p><video ref={video} muted playsInline className="w-full rounded-xl bg-black" aria-label={t("Camera for workout {0}", { 0: selected })} /><button className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-thrivv-gold-400" onClick={stop}>{t("Stop camera")}</button></div>
    <Link className="block py-2 text-center text-sm text-thrivv-text-secondary hover:text-white" href="/member/workouts">{t("Back to workouts")}</Link>
  </section>;
}
