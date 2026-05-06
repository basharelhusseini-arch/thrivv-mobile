'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Dumbbell,
  UtensilsCrossed,
  Moon,
  CheckCircle,
  Loader2,
  Watch,
  Sparkles,
  ShieldCheck,
  PenLine,
} from 'lucide-react';
import { getTodayLog, computeTotals } from '@/lib/nutrition-log';
import PageHeader from '@/components/PageHeader';
import {
  ensureWhoopAutoSync,
  type WhoopStatusSnapshot,
} from '@/lib/whoop/auto-sync';
import {
  calculateHealthScore,
  type HealthScoreV2Output,
} from '@/lib/health-score-v2';

interface CheckinForm {
  didWorkout: boolean;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  sleepHours: string;
  habits: {
    sauna: boolean;
    steamRoom: boolean;
    iceBath: boolean;
    coldShower: boolean;
    meditation: boolean;
    stretching: boolean;
  };
}

function habitCount(h: CheckinForm['habits']): number {
  return Object.values(h).filter(Boolean).length;
}

function ScoreBar({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] uppercase tracking-[0.14em] text-gray-500">
        <span>{label}</span>
        <span className="font-mono text-gray-300 tabular-nums">
          {value.toFixed(1)} / {max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tone} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SourcePill({ verified }: { verified: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider border ${
        verified
          ? 'border-emerald-500/40 text-emerald-400/90 bg-emerald-500/10'
          : 'border-white/15 text-gray-400 bg-white/5'
      }`}
    >
      {verified ? (
        <>
          <ShieldCheck className="w-3 h-3" />
          WHOOP
        </>
      ) : (
        <>
          <PenLine className="w-3 h-3" />
          Manual
        </>
      )}
    </span>
  );
}

export default function CheckinPage() {
  const router = useRouter();
  const [todayStr] = useState(() => new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [currentScore, setCurrentScore] = useState<Record<string, unknown> | null>(
    null
  );
  const [whoopStatus, setWhoopStatus] = useState<WhoopStatusSnapshot | null>(
    null
  );

  const [formData, setFormData] = useState<CheckinForm>({
    didWorkout: false,
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    sleepHours: '',
    habits: {
      sauna: false,
      steamRoom: false,
      iceBath: false,
      coldShower: false,
      meditation: false,
      stretching: false,
    },
  });

  const whoopPreviewPayload = useMemo(() => {
    if (!whoopStatus?.connected || !whoopStatus.latest) return null;
    if (whoopStatus.latest.date !== todayStr) return null;
    return {
      recoveryScore: whoopStatus.latest.recoveryScore,
      sleepPerformancePct: null as number | null,
      sleepEfficiencyPct: whoopStatus.latest.sleepEfficiencyPct,
      totalSleepMs: whoopStatus.latest.totalSleepMs,
      dayStrain: whoopStatus.latest.dayStrain,
    };
  }, [whoopStatus, todayStr]);

  const preview: HealthScoreV2Output = useMemo(() => {
    const calsRaw = formData.calories.trim();
    let caloriesLogged: number | null = null;
    if (calsRaw !== '') {
      const n = parseInt(calsRaw, 10);
      if (Number.isFinite(n)) caloriesLogged = n;
    }
    const sleepRaw = formData.sleepHours.trim();
    let sleepHours: number | null = null;
    if (sleepRaw !== '') {
      const n = parseFloat(sleepRaw);
      if (Number.isFinite(n)) sleepHours = n;
    }

    return calculateHealthScore({
      whoop: whoopPreviewPayload,
      manual: {
        didWorkout: formData.didWorkout,
        sleepHours,
        habitsCompleted: habitCount(formData.habits),
        caloriesLogged,
      },
      date: todayStr,
    });
  }, [formData, whoopPreviewPayload, todayStr]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          router.push('/member/login');
          return false;
        }
        return true;
      } catch {
        router.push('/member/login');
        return false;
      }
    };

    const fetchTodayCheckin = async () => {
      try {
        const response = await fetch('/api/checkin/today');
        if (response.ok) {
          const data = await response.json();
          if (data.checkin) {
            setHasCheckedIn(true);
            const habitDetails = data.checkin.habit_details || {};
            setFormData({
              didWorkout: data.checkin.did_workout,
              calories: data.checkin.calories?.toString() || '',
              protein: '',
              carbs: '',
              fat: '',
              sleepHours: data.checkin.sleep_hours?.toString() || '',
              habits: {
                sauna: habitDetails.sauna || false,
                steamRoom: habitDetails.steamRoom || false,
                iceBath: habitDetails.iceBath || false,
                coldShower: habitDetails.coldShower || false,
                meditation: habitDetails.meditation || false,
                stretching: habitDetails.stretching || false,
              },
            });
          }
        }

        const refetchScore = async () => {
          const r = await fetch('/api/score/today', { cache: 'no-store' });
          if (r.ok) {
            const d = await r.json();
            setCurrentScore(d.score);
          }
        };
        await refetchScore();

        const status = await ensureWhoopAutoSync({
          onSynced: refetchScore,
        });
        setWhoopStatus(status);

        try {
          const memberId = localStorage.getItem('memberId');
          if (memberId) {
            const todayLog = await getTodayLog(memberId);

            if (todayLog.meals.length > 0) {
              const totals = computeTotals(todayLog);

              const nutritionResponse = await fetch(
                '/api/health/update-from-nutrition',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    memberId,
                    date: todayStr,
                    totalCalories: totals.calories,
                    totalProtein: totals.protein_g,
                    totalCarbs: totals.carbs_g,
                    totalFat: totals.fat_g,
                    mealCount: totals.mealCount,
                  }),
                }
              );

              if (nutritionResponse.ok) {
                const scoreResponse = await fetch('/api/score/today');
                if (scoreResponse.ok) {
                  const scoreData = await scoreResponse.json();
                  setCurrentScore(scoreData.score);
                }
              }
            }
          }
        } catch {
          /* nutrition sync is optional */
        }
      } catch (error) {
        console.error('Failed to fetch check-in:', error);
      } finally {
        setLoading(false);
      }
    };

    const initializePage = async () => {
      const isAuthenticated = await checkAuth();
      if (isAuthenticated) {
        await fetchTodayCheckin();
      }
    };

    initializePage();
  }, [router, todayStr]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        didWorkout: formData.didWorkout,
        calories: formData.calories ? parseInt(formData.calories, 10) : 0,
        sleepHours: formData.sleepHours ? parseFloat(formData.sleepHours) : 0,
        habits: formData.habits,
      };

      const response = await fetch('/api/checkin/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setCurrentScore(data.score);
        setHasCheckedIn(true);

        setTimeout(() => {
          router.push('/member/dashboard');
        }, 2000);
      } else {
        if (response.status === 401) {
          setError('Session expired. Please sign in again.');
          setTimeout(() => router.push('/member/login'), 2000);
        } else {
          const errorMsg =
            data.error || `Failed to save check-in (HTTP ${response.status})`;
          const codeMsg = data.code ? ` [Code: ${data.code}]` : '';
          setError(`${errorMsg}${codeMsg}`);
        }
        console.error('Check-in failed:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          code: data.code,
          details: data.details,
          supabaseError: data.supabaseError,
        });
      }
    } catch (error) {
      console.error('Check-in exception:', error);
      setError(
        `Network error: ${error instanceof Error ? error.message : 'Please try again.'}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const whoopConnected = Boolean(whoopStatus?.connected);
  const whoopTodaySynced =
    whoopConnected &&
    whoopStatus?.latest?.date === todayStr &&
    whoopStatus.latest != null;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 flex items-center justify-center animate-pulse">
            <Loader2 className="w-5 h-5 text-thrivv-gold-500 animate-spin" />
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-thrivv-text-muted">
            Preparing check-in
          </span>
        </div>
      </div>
    );
  }

  const savedFinal =
    currentScore && typeof currentScore.score === 'number'
      ? currentScore.score
      : null;

  const submitLabel = hasCheckedIn ? 'Update check-in' : 'Complete check-in';

  return (
    <div className="relative max-w-6xl mx-auto pb-28 lg:pb-8 space-y-6">
      {/* ambient */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(212,175,55,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212,175,55,0.15) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      <PageHeader
        eyebrow="Daily command centre"
        title="Check-In"
        subtitle={
          hasCheckedIn
            ? 'Update today’s signals — your preview refreshes as you go.'
            : 'Log food and habits; WHOOP carries verified strain, recovery, and sleep when synced.'
        }
      />

      {success && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 backdrop-blur-md p-5 flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-lg font-semibold text-white">Check-in complete</p>
            <p className="text-sm text-gray-400 mt-1">
              Health score saved. Taking you to the dashboard…
            </p>
          </div>
        </div>
      )}

      {/* Mode messaging */}
      <div
        className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed backdrop-blur-md ${
          whoopConnected
            ? 'border-thrivv-gold-500/35 bg-thrivv-gold-500/[0.06] text-gray-200'
            : 'border-white/10 bg-white/[0.03] text-gray-300'
        }`}
      >
        {whoopConnected ? (
          <p>
            <span className="font-semibold text-white">WHOOP connected</span>
            {' — '}
            activity, recovery, and sleep are verified automatically when today’s
            data has synced. Use check-in for{' '}
            <span className="text-thrivv-gold-400">food</span> and{' '}
            <span className="text-thrivv-gold-400">habits</span>.
            {!whoopTodaySynced && (
              <span className="block mt-2 text-xs text-gray-500">
                Preview uses manual activity / sleep until today’s WHOOP row is
                available after sync.
              </span>
            )}
          </p>
        ) : (
          <p>
            <span className="font-semibold text-white">Manual mode</span>
            {' — '}
            log activity, sleep, food, and habits here.{' '}
            <span className="text-thrivv-gold-400">Connect WHOOP</span> for
            verified activity, recovery, and sleep.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(300px,380px)] gap-6 lg:gap-8 items-start">
          {/* RIGHT column on desktop — FIRST on mobile (score preview) */}
          <aside className="order-1 lg:order-2 lg:sticky lg:top-24 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl p-6 shadow-[0_0_60px_-20px_rgba(234,179,8,0.35)] relative overflow-hidden">
              <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-thrivv-gold-500/15 blur-3xl pointer-events-none" />

              <div className="relative flex items-start justify-between gap-3 mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-gray-500 mb-1">
                    Live preview
                  </p>
                  <p className="text-xs text-gray-500">
                    Same formula as the server — updates as you edit.
                  </p>
                </div>
                <Sparkles className="w-5 h-5 text-thrivv-gold-500/80 shrink-0" />
              </div>

              <div className="relative flex items-end gap-4 mb-6">
                <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-amber-200 via-thrivv-gold-400 to-amber-700 leading-none tabular-nums">
                  {preview.finalScore}
                </div>
                <div className="pb-1 text-sm text-gray-400">
                  / 100{' '}
                  <span className="text-gray-600 mx-1">·</span>{' '}
                  <span className="text-gray-300 tabular-nums">
                    {preview.rawScore.toFixed(1)}
                  </span>{' '}
                  <span className="text-gray-600">/ 110 raw</span>
                </div>
              </div>

              {savedFinal != null && (
                <p className="text-[11px] text-gray-500 mb-4">
                  Last saved today:{' '}
                  <span className="text-gray-300 font-mono">{savedFinal}</span>
                  {typeof currentScore?.score_source === 'string' && (
                    <span className="ml-2 uppercase tracking-wider text-[10px] text-thrivv-gold-500/90">
                      {String(currentScore.score_source)}
                    </span>
                  )}
                </p>
              )}

              <div className="relative space-y-4 mb-6">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
                    Activity
                  </span>
                  <SourcePill verified={preview.inputsUsed.whoopActivity} />
                </div>
                <ScoreBar
                  label="Activity"
                  value={preview.componentBreakdown.activity}
                  max={50}
                  tone="from-amber-600 to-yellow-400"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
                    Recovery + sleep
                  </span>
                  <SourcePill
                    verified={
                      preview.inputsUsed.whoopRecovery ||
                      preview.inputsUsed.whoopSleep
                    }
                  />
                </div>
                <ScoreBar
                  label="Recovery + sleep"
                  value={preview.componentBreakdown.recoverySleep}
                  max={30}
                  tone="from-sky-700 to-cyan-400"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
                    Food
                  </span>
                  <SourcePill verified={false} />
                </div>
                <ScoreBar
                  label="Food"
                  value={preview.componentBreakdown.food}
                  max={20}
                  tone="from-emerald-800 to-emerald-400"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
                    Habits
                  </span>
                  <SourcePill verified={false} />
                </div>
                <ScoreBar
                  label="Habits"
                  value={preview.componentBreakdown.habits}
                  max={10}
                  tone="from-violet-900 to-violet-400"
                />
              </div>

              {whoopConnected && (
                <div className="relative flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-gray-400 mb-4">
                  <Watch className="w-4 h-4 text-thrivv-gold-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-gray-300 font-medium truncate">
                      WHOOP sync
                    </p>
                    <p className="truncate text-[11px] text-gray-500">
                      {whoopStatus?.lastSyncedAt
                        ? `Last sync ${new Date(whoopStatus.lastSyncedAt).toLocaleString()}`
                        : 'Waiting for first sync…'}
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || success}
                className="relative hidden lg:flex w-full btn-primary py-4 px-6 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed items-center justify-center gap-2 rounded-xl"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving…
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Saved
                  </>
                ) : (
                  submitLabel
                )}
              </button>
            </div>
          </aside>

          {/* LEFT column — inputs */}
          <div className="order-2 lg:order-1 flex flex-col gap-4">
            {/* Activity */}
            <section className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/25">
                    <Dumbbell className="w-4 h-4 text-thrivv-gold-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white tracking-wide">
                      Activity
                    </h2>
                    <p className="text-[11px] text-gray-500">Up to 50 raw pts</p>
                  </div>
                </div>
                {whoopTodaySynced && (
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400/90 border border-emerald-500/30 rounded-full px-2 py-0.5">
                    WHOOP strain
                  </span>
                )}
              </div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                    formData.didWorkout
                      ? 'bg-thrivv-gold-500 border-thrivv-gold-500'
                      : 'border-gray-600 group-hover:border-thrivv-gold-400/60'
                  }`}
                >
                  {formData.didWorkout && (
                    <CheckCircle className="w-4 h-4 text-black" />
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={formData.didWorkout}
                  onChange={(e) =>
                    setFormData({ ...formData, didWorkout: e.target.checked })
                  }
                  className="sr-only"
                />
                <span className="text-white font-medium">
                  I trained / worked out today
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-3 ml-9 leading-relaxed">
                Manual workouts refine scoring when WHOOP doesn’t show strain yet,
                or when you’re not on WHOOP.
              </p>
            </section>

            {/* Nutrition / Food */}
            <section className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                  <UtensilsCrossed className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-wide">
                    Nutrition
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    Food score · up to 20 raw pts
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    Calories
                  </label>
                  <input
                    type="number"
                    value={formData.calories}
                    onChange={(e) =>
                      setFormData({ ...formData, calories: e.target.value })
                    }
                    placeholder="e.g. 2200"
                    min={0}
                    max={10000}
                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-thrivv-gold-500/50 focus:border-thrivv-gold-500/40 transition-all"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(['protein', 'carbs', 'fat'] as const).map((key) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 capitalize">
                        {key === 'protein'
                          ? 'Protein (g)'
                          : key === 'carbs'
                            ? 'Carbs (g)'
                            : 'Fat (g)'}
                      </label>
                      <input
                        type="number"
                        value={formData[key]}
                        onChange={(e) =>
                          setFormData({ ...formData, [key]: e.target.value })
                        }
                        placeholder={key === 'protein' ? '150' : key === 'carbs' ? '200' : '70'}
                        min={0}
                        step={0.1}
                        className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-lg text-white text-sm placeholder-gray-600 focus:ring-2 focus:ring-thrivv-gold-500/40"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Macros are optional UI helpers — scoring uses calories toward your
                  targets (preview matches saved check-in logic).
                </p>
              </div>
            </section>

            {/* Sleep */}
            <section className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/25">
                    <Moon className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white tracking-wide">
                      Sleep
                    </h2>
                    <p className="text-[11px] text-gray-500">
                      Recovery + sleep · up to 30 raw pts combined
                    </p>
                  </div>
                </div>
                {whoopTodaySynced && (
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400/90 border border-emerald-500/30 rounded-full px-2 py-0.5">
                    WHOOP sleep
                  </span>
                )}
              </div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                Hours of sleep <span className="text-gray-600">(optional)</span>
              </label>
              <input
                type="number"
                value={formData.sleepHours}
                onChange={(e) =>
                  setFormData({ ...formData, sleepHours: e.target.value })
                }
                placeholder="e.g. 7.5"
                min={0}
                max={24}
                step={0.5}
                className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-thrivv-gold-500/50 transition-all"
              />
              <p className="text-xs text-gray-500 mt-2">
                Used when WHOOP sleep isn’t available yet — aim for roughly 7.5–9h
                for solid manual credit.
              </p>
            </section>

            {/* Habits */}
            <section className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/25">
                  <Activity className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-wide">
                    Habits
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    Up to 10 raw pts · 2+ habits = full credit
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    ['sauna', 'Sauna'],
                    ['steamRoom', 'Steam room'],
                    ['iceBath', 'Ice bath'],
                    ['coldShower', 'Cold shower'],
                    ['meditation', 'Meditation'],
                    ['stretching', 'Stretching'],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 cursor-pointer group rounded-lg border border-transparent px-2 py-2 hover:border-white/10 hover:bg-white/[0.03]"
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                        formData.habits[key]
                          ? 'bg-thrivv-gold-500 border-thrivv-gold-500'
                          : 'border-gray-600 group-hover:border-thrivv-gold-400/50'
                      }`}
                    >
                      {formData.habits[key] && (
                        <CheckCircle className="w-3 h-3 text-black" />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.habits[key]}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          habits: {
                            ...formData.habits,
                            [key]: e.target.checked,
                          },
                        })
                      }
                      className="sr-only"
                    />
                    <span className="text-sm text-gray-200">{label}</span>
                  </label>
                ))}
              </div>
            </section>

            {error && (
              <div className="rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 px-4 py-3 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Mobile sticky CTA */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-10 bg-gradient-to-t from-black via-black/95 to-transparent">
          <button
            type="submit"
            disabled={submitting || success}
            className="pointer-events-auto w-full btn-primary py-4 px-6 text-base font-bold rounded-xl shadow-[0_-8px_40px_rgba(0,0,0,0.6)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving…
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Saved
              </>
            ) : (
              submitLabel
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
