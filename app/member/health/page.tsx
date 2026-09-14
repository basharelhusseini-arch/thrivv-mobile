'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, TrendingUp, Zap, Moon, UtensilsCrossed, Target, Award, Sparkles, ArrowRight, Calendar, CheckCircle } from 'lucide-react';
import PageHeader from '@/components/MemberPageHeader';

interface HealthSummary {
  timezone: string;
  workouts: { id: string; start_at: string; duration_ms: number; strain: number | null; kilojoule: number | null; zone_durations_ms: (number | null)[] | null; score_state: string; sport_name: string | null; score_input_valid: boolean; workout_score: number | null; workout_breakdown: { label: string; breakdown: number[] } | null }[];
  score: number | null;
  subtotal: number | null;
  complete: boolean;
  updatedAt: string;
  streak: number;
  last7Days: Array<{
    date: string;
    score: number;
    training_score: number;
    diet_score: number;
    sleep_score: number;
    habit_score: number;
  }>;
  components: {
    training: number | null;
    diet: number;
    sleep: number | null;
    habits: number;
  };
  insights: string[];
}

export default function MemberHealthPage() {
  const router = useRouter();
  const [healthData, setHealthData] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthData = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/health/summary');
      
      if (response.status === 401) {
        router.push('/member/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch health data');
      }

      const data = await response.json();
      setHealthData(data);
    } catch (err: any) {
      console.error('Failed to fetch health data:', err);
      setError(err.message || 'Failed to load health data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-thrivv-neon-green';
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-thrivv-gold-500';
    if (score >= 40) return 'text-thrivv-gold-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-thrivv-neon-green/20 border-thrivv-neon-green/30';
    if (score >= 80) return 'bg-green-500/20 border-green-500/30';
    if (score >= 60) return 'bg-thrivv-gold-500/20 border-thrivv-gold-500/30';
    if (score >= 40) return 'bg-thrivv-gold-500/20 border-thrivv-gold-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-12 h-12 text-thrivv-gold-500 mx-auto mb-4 animate-pulse" />
          <p className="text-thrivv-text-secondary">Loading health statistics...</p>
        </div>
      </div>
    );
  }

  // Show partial UI even if data fetch failed
  const score = healthData?.score ?? healthData?.subtotal ?? null;
  const components = healthData?.components || { training: null, diet: 0, sleep: null, habits: 0 };
  const insights = healthData?.insights || [];
  const last7Days = healthData?.last7Days || [];
  const streak = healthData?.streak || 0;

  return (
    <div className="member-future space-y-8" data-section="health">
      <PageHeader
        section="health"
        eyebrow="Your data"
        title="See the bigger picture."
        subtitle="Track your overall health and the components feeding your gym leaderboard rank."
        action={
          streak > 0 ? (
            <div className="bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 rounded-xl px-6 py-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-thrivv-gold-500" />
                <div>
                  <p className="text-2xl font-bold text-thrivv-gold-500">{streak}</p>
                  <p className="text-xs text-thrivv-text-muted">Day Streak</p>
                </div>
              </div>
            </div>
          ) : undefined
        }
      />


      {/* Error Warning (if any) */}
      {error && (
        <div className="bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 rounded-lg p-4">
          <p className="text-sm text-thrivv-gold-400">
            We couldn&apos;t load your health history. Please retry to see your latest scores.
          </p>
          <button onClick={() => void fetchHealthData()} className="mt-2 text-sm text-thrivv-gold-400 underline">Retry</button>
        </div>
      )}

      {/* Health Score Card */}
      <div className="premium-card">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-thrivv-text-secondary mb-2">Your Health Score</h2>
              <div className="flex items-baseline space-x-3">
                <span className={`text-6xl font-bold ${getScoreColor(score ?? 0)}`}>
                  {score ?? "—"}
                </span>
                <span className="text-2xl text-thrivv-text-muted">/ 110</span>
              </div>
              {healthData?.updatedAt && (
                <p className="text-xs text-thrivv-text-muted mt-2">
                  Last updated: {new Date(healthData.updatedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className={`p-6 rounded-full ${getScoreBgColor(score ?? 0)} border-2`}>
              <Award className="w-12 h-12 text-thrivv-gold-500" />
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="glass-effect rounded-lg p-4 card-hover">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-thrivv-text-secondary">Training</span>
                <Zap className="w-4 h-4 text-thrivv-gold-500" />
              </div>
              <p className="text-2xl font-bold text-thrivv-text-primary">{components.training ?? "—"}</p>
              <p className="text-xs text-thrivv-text-muted mt-1">of 80 points</p>
            </div>

            <div className="glass-effect rounded-lg p-4 card-hover">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-thrivv-text-secondary">Recovery</span>
                <Moon className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-thrivv-text-primary">{components.sleep ?? "—"}</p>
              <p className="text-xs text-thrivv-text-muted mt-1">of 20 points</p>
            </div>

            <div className="glass-effect rounded-lg p-4 card-hover">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-thrivv-text-secondary">Habits</span>
                <Target className="w-4 h-4 text-thrivv-gold-400" />
              </div>
              <p className="text-2xl font-bold text-thrivv-text-primary">{components.habits}</p>
              <p className="text-xs text-thrivv-text-muted mt-1">of 10 points</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-thrivv-text-muted">{healthData?.complete ? 'Complete Health Score.' : 'Provisional — awaiting verified WHOOP inputs.'} Sleep component — based on WHOOP Recovery, the selected proxy rather than a direct measurement of sleep quality.</p>
      <Link href="/member/checkin" className="inline-block text-sm text-thrivv-gold-500">Update today’s habits →</Link>
      {Boolean(healthData?.workouts?.length) && <div className="premium-card p-6">
        <h2 className="text-lg font-semibold text-thrivv-text-primary">Recent WHOOP workouts</h2>
        <p className="text-sm text-thrivv-text-muted mt-2">Your highest eligible workout each day supplies Training points. Additional workouts do not stack. Up to 100 recent workouts shown.</p>
        <div className="divide-y divide-thrivv-gold-500/10 mt-4">{healthData!.workouts.map(workout => <div key={workout.id} className="py-4 text-sm">
          <div className="flex justify-between gap-4"><span className="text-thrivv-text-primary capitalize">{workout.workout_breakdown?.label ?? workout.sport_name ?? 'Other'}</span>
            <span className="text-thrivv-gold-500">{workout.score_input_valid && workout.workout_score !== null ? `${workout.workout_score.toFixed(1)}/100` : 'Pending score'}</span></div>
          <p className="text-thrivv-text-muted">{new Date(workout.start_at).toLocaleString(undefined, { timeZone: healthData!.timezone })} · {(workout.duration_ms / 60000).toFixed(1)} elapsed minutes</p>
          <p className="text-thrivv-text-muted">Strain: {workout.strain ?? 'Unavailable'}/21 · Calories: {workout.kilojoule === null ? 'Unavailable' : `${(workout.kilojoule / 4.184).toFixed(0)} kcal`} · WHOOP status: {workout.score_state}</p>
          <p className="text-xs text-thrivv-text-muted">{[0,1,2,3,4,5].map(zone => `Zone ${zone}: ${workout.zone_durations_ms?.[zone] == null ? 'Unavailable' : `${(workout.zone_durations_ms[zone]! / 60000).toFixed(1)} min`}`).join(' · ')}</p>
          {workout.score_input_valid && workout.workout_breakdown && <p className="text-xs text-thrivv-text-muted mt-1">{['Strain', 'Duration', 'Zones', 'Calories'].map((label, i) => `${label}: ${workout.workout_breakdown!.breakdown[i].toFixed(1)}`).join(' · ')}</p>}
        </div>)}</div>
      </div>}
      {/* 7-Day Trend */}
      {last7Days.length > 0 && (
        <div className="premium-card">
          <div className="px-6 py-4 border-b border-thrivv-gold-500/20">
            <h2 className="text-lg font-semibold text-thrivv-text-primary flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-thrivv-gold-500" />
              7-Day Trend
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-7 gap-2">
              {last7Days.map((day, index) => (
                <div key={index} className="text-center">
                  <div className="text-xs text-thrivv-text-muted mb-2">
                    {new Date(`${day.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={`w-full h-24 rounded-lg border-2 flex items-end justify-center p-2 ${getScoreBgColor(day.score)}`}>
                    <span className={`text-lg font-bold ${getScoreColor(day.score)}`}>
                      {day.score}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="text-xs text-thrivv-text-muted flex items-center justify-center">
                      <Zap className="w-3 h-3 mr-1 text-thrivv-gold-500" />
                      {day.training_score}
                    </div>
                    <div className="text-xs text-thrivv-text-muted flex items-center justify-center">
                      <UtensilsCrossed className="w-3 h-3 mr-1 text-thrivv-neon-green" />
                      Recovery {day.sleep_score} · Habits {day.habit_score}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Insights */}
        <div className="premium-card">
          <div className="px-6 py-4 border-b border-thrivv-gold-500/20">
            <h2 className="text-lg font-semibold text-thrivv-text-primary flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-thrivv-gold-500" />
              Health Insights · Rule-based
            </h2>
          </div>
          <div className="p-6 space-y-3">
            {insights.length > 0 ? (
              insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-4 bg-thrivv-bg-card/30 rounded-lg border border-thrivv-gold-500/10 hover:border-thrivv-gold-500/30 transition-colors"
                >
                  <CheckCircle className="w-5 h-5 text-thrivv-gold-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-thrivv-text-secondary leading-relaxed">
                    {insight}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-thrivv-text-muted mx-auto mb-4" />
                <p className="text-thrivv-text-secondary text-sm">
                  Complete check-ins to unlock personalized insights
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="premium-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Understand your score</h2>
          <p className="text-sm leading-relaxed text-thrivv-text-secondary">Training contributes up to 80, WHOOP Recovery up to 20, and habits up to 10. Complete daily Health Scores add to your gym’s weekly ranking.</p>
          <p className="text-sm leading-relaxed text-thrivv-text-secondary">Your Health Score is separate from your spendable reward balance. Members without WHOOP can earn manual workout rewards without a complete Health Score.</p>
          <Link href="/member/whoop" className="inline-flex items-center gap-2 text-sm text-thrivv-gold-400">Manage WHOOP <ArrowRight size={14} /></Link>
        </div>
      </div>

    </div>
  );
}
