'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ensureWhoopAutoSync } from '@/lib/whoop/auto-sync';
export type VerificationStatus = {
  gymId: string | null; date: string; timezone: string; verificationEnabled: boolean; rewardsEnabled: boolean;
  score: number | null; estimatedPoints: number | null; creditedPoints: number; rewardStatus: string;
  manual?: { eligible: boolean; enabled: boolean; checkedIn: boolean; verified: boolean; canScan: boolean; estimatedPoints: number };
  workouts: { id: string; sport_name: string | null; start_at: string; date: string; canScan: boolean; verified: boolean; scanUntil: string; status: string }[];
};
export default function GymWorkoutVerification({ scanner = false }: { scanner?: boolean }) {
  const [data, setData] = useState<VerificationStatus | null>(null);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [selected, setSelected] = useState(''); const [running, setRunning] = useState(false); const [busy, setBusy] = useState(false);
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null);
  const generation = useRef(0); const frame = useRef(0); const mounted = useRef(true); const loading = useRef(false);
  const requests = useRef<Record<string, string>>({});
  const refresh = useCallback(async () => {
    if (loading.current) return; loading.current = true;
    try {
      const res = await fetch('/api/member/workout-verification', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error('Workout verification status is unavailable. Please retry.');
      const next = await res.json(); if (mounted.current) { setData(next); setError(''); }
    } catch (e) { if (mounted.current) { setData(null); setError(e instanceof Error ? e.message : 'Status unavailable'); } }
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
    setBusy(true); setMessage('Verifying your workout…');
    try {
      const res = await fetch('/api/member/workout-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId, qr, requestId: requests.current[workoutId] ||= crypto.randomUUID() }), signal: AbortSignal.timeout(15000) });
      const result = await res.json(); if (!res.ok) throw new Error(result.error || 'Scan not accepted');
      if (mounted.current) setMessage(result.reward?.status === 'credited' ? 'Points credited' : result.reward?.status === 'not_activated' ? 'Gym verified — rewards not activated' : 'Gym verified — score or reward eligibility pending');
      await refresh();
    } catch (e) { if (mounted.current) { setMessage(''); setError(e instanceof Error ? e.message : 'Verification unavailable. Scan again to retry safely.'); } }
    finally { if (mounted.current) setBusy(false); }
  }
  return <section className="dark-card p-5 sm:p-7 space-y-4" aria-label="Gym workout verification">
    <h2 className="text-xl font-semibold text-white">{scanner ? 'Scan your gym’s workout QR' : 'Verify your gym workout'}</h2>
    <p className="text-sm text-gray-400">{data?.manual?.eligible
      ? 'Without WHOOP: log today’s workout, then scan your gym’s changing QR for 40 spendable reward points plus up to 10 habit points. Maximum 50 per day; sleep does not add points.'
      : 'Sync your WHOOP workout first, then scan the changing code displayed by your gym within two hours of finishing. WHOOP reward conversion is not activated yet.'}</p>
    {error && <p role="alert" className="text-amber-300">{error} <button className="underline" onClick={() => void refresh()}>Refresh status</button></p>}
    {message && <p role="status" className="text-thrivv-gold-400">{message}</p>}
    {!data && !error && <p className="text-gray-400">Loading workout status…</p>}
    {data && !data.gymId && <Link className="text-thrivv-gold-400 underline" href="/member/account/join-gym">Join a gym</Link>}
    {data && !data.verificationEnabled && <p className="text-amber-300">Workout verification is not activated yet.</p>}
    {data?.manual?.eligible && data.gymId && <div className="border-t border-gray-800 pt-4 space-y-3">
      <p className="text-white">Today’s manual workout · {data.manual.verified ? `${data.creditedPoints} points credited` : data.manual.checkedIn ? 'Check-in saved' : 'Check-in required'}</p>
      <Link className="text-thrivv-gold-400 underline" href="/member/checkin">{data.manual.checkedIn ? 'Update today’s habits' : 'Log today’s workout'}</Link>
      {data.manual.canScan && (scanner ? <button disabled={busy || running} onClick={() => void start('manual')} className="block rounded-xl bg-thrivv-gold-500 text-black px-4 py-3 font-semibold disabled:opacity-50">{data.manual.verified ? 'Scan again safely' : 'Scan gym QR'}</button>
        : <Link className="block text-thrivv-gold-400 underline" href="/member/scan-workout">Scan gym QR to claim points</Link>)}
      {data.manual.verified && <p className="text-sm text-gray-400">Additional scans never award another 40 points. Save habit updates in Check-In.</p>}
    </div>}
    {data && !data.manual?.eligible && data.workouts.length === 0 && <p className="text-gray-400">No imported workouts in the last seven days. After your workout, sync WHOOP from Wearable.</p>}
    {(scanner ? data?.workouts : data?.workouts.filter(w => w.canScan || w.date === data.date).slice(0,3))?.map(w => <div key={w.id} className="border-t border-gray-800 pt-4 flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-white">{w.sport_name || 'WHOOP workout'}</p><p className="text-xs text-gray-400">{w.date} · {w.status}</p></div>
      {w.canScan && (scanner ? <button disabled={busy || running} onClick={() => void start(w.id)} className="rounded-xl bg-thrivv-gold-500 text-black px-4 py-3 font-semibold disabled:opacity-50">Scan gym QR</button>
        : <Link className="rounded-xl bg-thrivv-gold-500 text-black px-4 py-3 font-semibold" href="/member/scan-workout">Scan gym QR to unlock points</Link>)}
    </div>)}
    {!scanner && Boolean(data?.workouts.length) && <Link href="/member/scan-workout" className="inline-block text-thrivv-gold-400 underline">View workout verification</Link>}
    {scanner && <div className={running ? 'space-y-3' : 'hidden'}><p className="text-sm text-gray-400">Point your camera at the gym’s changing workout QR. Camera images stay on your device.</p>
      <video ref={video} muted playsInline className="w-full max-w-lg rounded-xl bg-black" aria-label={`Camera for workout ${selected}`} />
      <button className="text-thrivv-gold-400 underline" onClick={stop}>Stop camera</button></div>}
    {scanner && <Link className="inline-block text-thrivv-gold-400 underline" href="/member/health">Back to Health</Link>}
  </section>;
}
