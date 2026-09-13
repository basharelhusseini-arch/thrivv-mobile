'use client';
import { useEffect, useState } from 'react';

type DisplayCode = { image: string; expires: number; refresh: number };
export default function GymWorkoutQr({ gymId }: { gymId: string }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<DisplayCode | null>(null);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    setCode(null); setError('');
    if (!open) return;
    let active = true, busy = false, current: DisplayCode | null = null, nextAttempt = 0;
    let controller: AbortController | null = null;
    async function load() {
      if (busy || document.hidden || !active) return;
      busy = true; const started = performance.now();
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10000);
      try {
        const response = await fetch(`/api/gym/${gymId}/workout-qr`, { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to refresh workout QR.');
        if (typeof data.image !== 'string' || !data.image.startsWith('data:image/svg+xml;base64,') ||
            ![data.serverNow, data.expiresAt, data.refreshAt].every(Number.isFinite) || data.expiresAt <= data.serverNow ||
            data.expiresAt - data.serverNow > 60000) throw new Error('Invalid QR response. Please retry.');
        // Subtract the entire round trip conservatively; never trust the device wall clock.
        const result = { image: data.image, expires: started + data.expiresAt - data.serverNow, refresh: started + data.refreshAt - data.serverNow };
        if (active && !document.hidden && result.expires > performance.now()) {
          current = result; setCode(result); setError('');
          setSeconds(Math.max(0, Math.ceil((result.refresh - performance.now()) / 1000)));
        }
      } catch (e) {
        if (active && !document.hidden) {
          if (!current || performance.now() >= current.expires) { current = null; setCode(null); }
          setError(e instanceof Error ? e.message : 'Unable to refresh workout QR.');
        }
      } finally { clearTimeout(timeout); busy = false; nextAttempt = performance.now() + 5000; }
    }
    function tick() {
      if (document.hidden) return;
      if (current && performance.now() >= current.expires) { current = null; setCode(null); }
      if (current) setSeconds(Math.max(0, Math.ceil((current.refresh - performance.now()) / 1000)));
      if ((!current || performance.now() >= current.refresh) && performance.now() >= nextAttempt) void load();
    }
    function visibility() {
      current = null; setCode(null); controller?.abort(); nextAttempt = 0;
      if (!document.hidden) void load();
    }
    void load(); const timer = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', visibility);
    return () => { active = false; clearInterval(timer); controller?.abort(); document.removeEventListener('visibilitychange', visibility); };
  }, [open, gymId, retry]);
  return <section className="glass-card p-6 sm:p-8 space-y-4" aria-labelledby="workout-qr-heading">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h2 id="workout-qr-heading" className="text-2xl font-semibold text-thrivv-text-primary">Workout QR</h2><p className="text-sm text-thrivv-text-secondary mt-2">Display this changing code on a screen at your gym.</p></div>
      <button className="btn-primary px-5 py-3" onClick={() => setOpen(!open)}>{open ? 'Close QR display' : 'Open QR display'}</button>
    </div>
    <p className="text-sm text-thrivv-gold-500">Members scan from Health after their WHOOP workout syncs. Verification and rewards require platform activation; displaying a code does not activate them.</p>
    {open && <div className="flex flex-col items-center gap-4 py-4">
      {code ? <>
        {/* A native image keeps the signed payload out of image-optimizer URLs and logs. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={code.image} width={512} height={512} className="w-full max-w-lg h-auto bg-white rounded-xl" alt="Rotating gym workout verification QR" />
        <p className="text-sm text-thrivv-text-secondary">{seconds > 0 ? `Next code in ${seconds}s` : 'Refreshing code…'} · Expires after 60 seconds</p>
      </> : <p role="status" className="p-8 text-center">{error || 'Preparing your gym QR…'}</p>}
      {error && <><p role="alert" className="text-amber-300">{error}</p><button className="text-thrivv-gold-500 underline" onClick={() => setRetry(n => n + 1)}>Retry</button></>}
      <p className="text-xs text-thrivv-text-secondary text-center">This is separate from your member joining code. Keep this screen online; do not print it.</p>
    </div>}
  </section>;
}
