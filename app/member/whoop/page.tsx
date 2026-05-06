'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity,
  Link as LinkIcon,
  TrendingUp,
  Zap,
  Moon,
  Heart,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';

type WhoopStatus = {
  connected: boolean;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  scoreSource: 'manual' | 'whoop' | 'hybrid' | null;
  latest: {
    date: string;
    recoveryScore: number | null;
    dayStrain: number | null;
    sleepEfficiencyPct: number | null;
    totalSleepMs: number | null;
  } | null;
};

export default function WhoopIntegrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<WhoopStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [banner, setBanner] = useState<
    { kind: 'success' | 'error'; text: string } | null
  >(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whoop/status', { cache: 'no-store' });
      if (res.status === 401) {
        router.push('/member/login?redirect=/member/whoop');
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as WhoopStatus;
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to load WHOOP status:', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Surface OAuth callback result if the user was bounced here
  // with ?whoop=connected or ?whoop=error.
  useEffect(() => {
    const flag = searchParams.get('whoop');
    if (flag === 'connected') {
      setBanner({ kind: 'success', text: 'WHOOP connected. Sync to pull yesterday\u2019s data.' });
    } else if (flag === 'error') {
      setBanner({ kind: 'error', text: 'Could not connect WHOOP. Please try again.' });
    }
  }, [searchParams]);

  const handleConnect = () => {
    // Hand off to the real OAuth route (server-side; sets state cookie).
    window.location.href = '/api/whoop/connect';
  };

  const handleSync = async () => {
    setSyncing(true);
    setBanner(null);
    try {
      const res = await fetch('/api/whoop/sync', { method: 'POST' });
      if (res.status === 401) {
        setBanner({ kind: 'error', text: 'WHOOP reconnect required.' });
        await fetchStatus();
        return;
      }
      if (res.status === 503) {
        setBanner({
          kind: 'error',
          text: 'WHOOP is temporarily unavailable. Try again shortly.',
        });
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setBanner({
          kind: 'error',
          text: data?.error || 'Sync failed. Try again.',
        });
        return;
      }
      setBanner({ kind: 'success', text: 'Synced. Health Score updated.' });
      await fetchStatus();
    } catch (err) {
      console.error('Sync failed:', err);
      setBanner({ kind: 'error', text: 'Sync failed. Try again.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your WHOOP account?')) return;
    try {
      const res = await fetch('/api/whoop/status', { method: 'DELETE' });
      if (res.ok) {
        setStatus({
          connected: false,
          connectedAt: null,
          lastSyncedAt: null,
          scoreSource: null,
          latest: null,
        });
        setBanner({ kind: 'success', text: 'WHOOP disconnected.' });
      } else {
        setBanner({ kind: 'error', text: 'Failed to disconnect.' });
      }
    } catch {
      setBanner({ kind: 'error', text: 'Failed to disconnect.' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center animate-pulse">
            <Heart className="w-5 h-5 text-thrivv-gold-500" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">
            Loading WHOOP
          </span>
        </div>
      </div>
    );
  }

  const connected = status?.connected ?? false;
  const latest = status?.latest ?? null;

  // Recovery + strain are 0..100 / 0..21 in WHOOP's native units.
  // We surface the WHOOP day_strain integer as-is (rounded to one
  // decimal) — the existing card just renders the number.
  const recoveryDisplay =
    latest?.recoveryScore != null ? Math.round(latest.recoveryScore) : null;
  const strainDisplay =
    latest?.dayStrain != null ? Math.round(latest.dayStrain * 10) / 10 : null;
  const sleepHours =
    latest?.totalSleepMs != null
      ? Math.floor(latest.totalSleepMs / 3_600_000)
      : null;
  const sleepMinutes =
    latest?.totalSleepMs != null
      ? Math.round((latest.totalSleepMs % 3_600_000) / 60_000)
      : null;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Wearable"
        title="Whoop Integration"
        subtitle="Connect your Whoop device to track recovery, strain, and sleep automatically. Rolling out."
      />

      {banner && (
        <div
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
            banner.kind === 'success'
              ? 'border-thrivv-neon-green/30 bg-thrivv-neon-green/5 text-thrivv-neon-green'
              : 'border-red-500/30 bg-red-500/5 text-red-400'
          }`}
        >
          {banner.kind === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span className="text-sm">{banner.text}</span>
        </div>
      )}

      <main>
        {!connected ? (
          <div className="premium-card p-12 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/20 mx-auto mb-5 flex items-center justify-center">
              <Activity className="w-7 h-7 text-thrivv-gold-500" />
            </div>
            <h3 className="text-lg font-semibold text-thrivv-text-primary mb-2">
              Connect your Whoop device
            </h3>
            <p className="text-thrivv-text-secondary mb-6 leading-relaxed">
              Connect your Whoop account to automatically sync recovery, strain, and sleep data into your Health Score.
            </p>
            <button
              onClick={handleConnect}
              className="btn-primary px-6 py-3 inline-flex items-center gap-2"
            >
              <LinkIcon className="w-4 h-4" />
              Connect Whoop Account
            </button>
            <p className="text-xs text-thrivv-text-muted mt-4">
              You will be redirected to Whoop to authorise Thrivv.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="premium-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="icon-badge inline-flex w-12 h-12 items-center justify-center shrink-0">
                    <Activity className="w-5 h-5 text-thrivv-gold-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-thrivv-text-primary">
                      Whoop Connected
                    </h3>
                    <p className="text-sm text-thrivv-text-secondary truncate">
                      Last synced:{' '}
                      {status?.lastSyncedAt
                        ? new Date(status.lastSyncedAt).toLocaleString()
                        : 'Never'}
                      {status?.scoreSource ? (
                        <>
                          {' '}
                          &middot; Score source:{' '}
                          <span className="capitalize">{status.scoreSource}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}
                    />
                    {syncing ? 'Syncing\u2026' : 'Sync now'}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 rounded-xl transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>

            {latest && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recoveryDisplay !== null && (
                  <div className="premium-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-thrivv-neon-green" />
                      <h4 className="font-semibold text-thrivv-text-primary">Recovery</h4>
                    </div>
                    <div className="text-3xl font-semibold text-thrivv-neon-green mb-1">
                      {recoveryDisplay}%
                    </div>
                    <p className="text-sm text-thrivv-text-secondary">
                      {latest.date}
                    </p>
                  </div>
                )}

                {strainDisplay !== null && (
                  <div className="premium-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-5 h-5 text-thrivv-gold-500" />
                      <h4 className="font-semibold text-thrivv-text-primary">Strain</h4>
                    </div>
                    <div className="text-3xl font-semibold text-thrivv-gold-500 mb-1">
                      {strainDisplay}
                    </div>
                    <p className="text-sm text-thrivv-text-secondary">
                      {latest.date}
                    </p>
                  </div>
                )}

                {sleepHours !== null && sleepMinutes !== null && (
                  <div className="premium-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Moon className="w-5 h-5 text-thrivv-gold-400" />
                      <h4 className="font-semibold text-thrivv-text-primary">Sleep</h4>
                    </div>
                    <div className="text-3xl font-semibold text-thrivv-text-primary mb-1">
                      {sleepHours}h {sleepMinutes}m
                    </div>
                    <p className="text-sm text-thrivv-text-secondary">
                      {latest.date}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!latest && (
              <div className="premium-card p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/20 mx-auto mb-4 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-thrivv-gold-500" />
                </div>
                <h3 className="text-lg font-semibold text-thrivv-text-primary mb-2">
                  No data synced yet
                </h3>
                <p className="text-thrivv-text-secondary mb-5">
                  Tap &ldquo;Sync now&rdquo; to pull yesterday&rsquo;s recovery, strain, and sleep from Whoop.
                </p>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="btn-primary px-6 py-3 inline-flex items-center gap-2 disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`}
                  />
                  {syncing ? 'Syncing\u2026' : 'Sync now'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
