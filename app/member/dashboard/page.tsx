'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, Users, CreditCard, LogOut, User, BookOpen, CheckCircle, Bell, DollarSign, Dumbbell, UtensilsCrossed, Target, Activity, Watch, Trophy, AlertCircle, Shield, TrendingUp } from 'lucide-react';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import { ConfidenceLevel } from '@/types';
import PageHeader, { gradient } from '@/components/MemberPageHeader';
import Reveal from '@/components/Reveal';
import { ensureWhoopAutoSync } from '@/lib/whoop/auto-sync';

interface UserData {
  id: string;
  email: string;
}

interface HealthScore {
  id: string;
  user_id: string;
  date: string;
  score: number | null;
  subtotal: number;
  complete: boolean;
  habit_score: number;
  recovery_score: number | null;
  training_score: number | null;
  diet_score: number;
  sleep_score: number;
  created_at: string;
}

interface LeaderboardEntry {
  scored_days: number;
  rank: number;
  training_score: number;
  recovery_score: number;
  habit_score: number;
  id: string;
  name: string;
  score: number;
}

interface CheckinData {
  id: string;
  user_id: string;
  date: string;
  did_workout: boolean;
  calories: number;
  sleep_hours: number;
  created_at: string;
}

interface ConfidenceScoreData {
  score: number;
  level: ConfidenceLevel;
  breakdown: {
    baseline: number;
    wearable: number;
    consistency: number;
    survey: number;
    longTerm: number;
  };
}

export default function MemberDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<ConfidenceScoreData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [scoreHistory, setScoreHistory] = useState<HealthScore[]>([]);
  const [todayCheckin, setTodayCheckin] = useState<CheckinData | null>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [board, setBoard] = useState<any>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Check authentication
        const authRes = await fetch('/api/auth/me');
        if (!authRes.ok) {
          router.push('/member/login');
          return;
        }
        const authData = await authRes.json();
        setUser(authData.user);

        const refetchScore = async () => {
          const [scoreRes, boardRes] = await Promise.all([
            fetch('/api/score/today', { cache: 'no-store' }), fetch('/api/leaderboard', { cache: 'no-store' }),
          ]);
          if (!scoreRes.ok || !boardRes.ok) { setLoadError(true); return; }
          const d = await scoreRes.json(); const b = await boardRes.json();
          setSnapshot(d); setHealthScore(d.score); setScoreHistory((d.history || []).filter((r: HealthScore) => r.complete));
          setBoard(b); setLeaderboard(b.leaderboard || []); setLoadError(false);
        };
        await refetchScore();
        void ensureWhoopAutoSync({ onSynced: refetchScore });

        // Check if today's check-in exists
        const checkinRes = await fetch('/api/checkin/today');
        if (checkinRes.ok) {
          const checkinData = await checkinRes.json();
          setTodayCheckin(checkinData.checkin);
        }

        // Fetch confidence score
        const confidenceRes = await fetch('/api/health/confidence-score');
        if (confidenceRes.ok) {
          const confidenceData = await confidenceRes.json();
          setConfidenceScore(confidenceData);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/member/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/member/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-thrivv-gold-500/20 blur-xl animate-pulse" aria-hidden />
            <div className="relative w-12 h-12 rounded-2xl bg-thrivv-gold-500/10 border border-thrivv-gold-500/40 flex items-center justify-center">
              <Activity className="w-5 h-5 text-thrivv-gold-500" />
            </div>
          </div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-thrivv-text-muted">
            Loading your snapshot
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const userDisplayName = user.email.split('@')[0];

  // HUD command-bar values — all derived from existing fetched state.
  // No new API calls, no fabricated numbers.
  const todayValue = healthScore?.score ?? null;
  const sevenDayAvg = snapshot?.average ?? null;
  const userRank = board?.currentRank ?? null;
  const todayCheckedIn = !!todayCheckin;

  return (
    <div className="member-future space-y-10" data-section="dashboard">
      <PageHeader
        section="dashboard"
        eyebrow={"Today\u2019s snapshot"}
        titleNode={<>Welcome back, {gradient(userDisplayName)}</>}
        subtitle={
          "Your daily training, recovery, and habit scores add up to your weekly total on your gym\u2019s leaderboard."
        }

      />

      <main className="space-y-8">
        {loadError && <p role="alert" className="text-thrivv-gold-500">Score data is unavailable. Please try again shortly.</p>}
        {/* HUD command bar — derived from existing state */}
        <Reveal delay={40}>
          <div className="relative glass-card overflow-hidden p-5 lg:p-6 shadow-[0_30px_120px_-40px_rgba(255,208,0,0.18)]">
            <div
              className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/40 to-transparent"
              aria-hidden
            />
            <div
              className="absolute -top-24 -right-24 w-56 h-56 bg-thrivv-gold-500/10 rounded-full blur-3xl pointer-events-none"
              aria-hidden
            />
            <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-y-6 lg:gap-y-0 lg:divide-x divide-thrivv-gold-500/10">
              <HudTile
                icon={Activity}
                label="Today’s Performance"
                value={todayValue !== null ? String(todayValue) : '\u2014'}
                sub={healthScore && !healthScore.complete ? `Provisional: ${healthScore.subtotal}/110` : "Health Score /110"}
                accent={todayValue !== null && todayValue >= 80 ? 'green' : 'gold'}
              />
              <HudTile
                icon={TrendingUp}
                label="7-day avg"
                value={sevenDayAvg !== null ? String(sevenDayAvg) : '\u2014'}
                sub={`${snapshot?.coverage ?? 0} of ${snapshot?.expected ?? 7} days${snapshot?.provisional ? ' · Provisional' : ''} · /110`}

              />
              <HudTile
                icon={Trophy}
                label="Weekly Gym Rank"
                value={userRank !== null ? `#${userRank}` : '\u2014'}
                sub={
                  leaderboard.length > 0
                    ? `of ${board?.rankedCount ?? 0}`
                    : 'No leaderboard yet'
                }
              />
              <HudTile
                icon={todayCheckedIn ? CheckCircle : AlertCircle}
                label="Status"
                value={snapshot?.status ?? 'Sync pending'}
                sub={snapshot?.lastSyncedAt ? `Synced ${new Date(snapshot.lastSyncedAt).toLocaleString()}` : 'No successful sync yet'}
                accent={todayCheckedIn ? 'green' : 'gold'}
              />
            </div>
          </div>
        </Reveal>
        {/* Check-in Alert */}
        {!todayCheckin && (
          <Reveal delay={60}>
            <div className="premium-card bg-thrivv-gold-500/5 border-thrivv-gold-500/30 p-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="icon-badge">
                  <AlertCircle className="w-5 h-5 text-thrivv-gold-500" />
                </div>
                <div>
                  <h3 className="text-thrivv-text-primary font-semibold mb-1">Complete Today&apos;s Check-in</h3>
                  <p className="text-thrivv-text-secondary text-sm">
                    Track your habits and review verified WHOOP data
                  </p>
                </div>
              </div>
              <Link
                href="/member/checkin"
                className="btn-primary px-6 py-3 whitespace-nowrap"
              >
                Check In
              </Link>
            </div>
          </Reveal>
        )}

        {/* Health Score & Leaderboard Section */}
        <Reveal delay={120}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Large Health Score Display */}
          <div className="lg:col-span-1">
            <div className="premium-card relative overflow-hidden p-8 flex flex-col items-center justify-center shadow-[0_30px_120px_-40px_rgba(255,208,0,0.2)]">
                <div
                  className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/40 to-transparent"
                  aria-hidden
                />
                <div
                  className="absolute -top-24 -right-24 w-56 h-56 bg-thrivv-gold-500/12 rounded-full blur-3xl pointer-events-none"
                  aria-hidden
                />
                {healthScore ? (
                  <>
                    {/* Circular Score Display */}
                    <div className="relative w-40 h-40 mb-8">
                      {/* Background Circle */}
                      <svg className="transform -rotate-90 w-40 h-40">
                        <circle
                          cx="80"
                          cy="80"
                          r="72"
                          stroke="currentColor"
                          strokeWidth="10"
                          fill="none"
                          className="text-thrivv-bg-card"
                        />
                        {/* Progress Circle */}
                        <circle
                          cx="80"
                          cy="80"
                          r="72"
                          stroke="currentColor"
                          strokeWidth="10"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 72}`}
                          strokeDashoffset={`${2 * Math.PI * 72 * (1 - (healthScore.score ?? healthScore.subtotal) / 110)}`}
                          className={`transition-all duration-1000 ${
                            (healthScore.score ?? 0) >= 80 ? 'text-thrivv-neon-green' : 'text-thrivv-gold-500'
                          }`}
                          strokeLinecap="round"
                        />
                      </svg>
                      {/* Score Number */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className={`text-6xl font-semibold tracking-tighter leading-none ${
                          (healthScore.score ?? 0) >= 80 ? 'text-thrivv-neon-green' : 'text-thrivv-gold-500'
                        }`}>
                          {healthScore.score ?? healthScore.subtotal}
                        </div>
                        <div className="mt-1.5 text-thrivv-text-muted text-[10px] uppercase tracking-[0.25em]">Health Score</div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-thrivv-text-muted text-center mb-6">
                      {healthScore.complete ? "Health Score /110" : "Provisional component total /110 — awaiting verified data"}
                    </p>

                    {/* Score Breakdown */}
                    <div className="w-full space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-thrivv-text-secondary text-sm flex items-center">
                          <Dumbbell className="w-4 h-4 mr-2 text-thrivv-gold-500" />
                          Training
                        </span>
                        <span className="text-thrivv-text-primary font-semibold">{healthScore.training_score ?? "—"}/80</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-thrivv-text-secondary text-sm flex items-center">
                          <UtensilsCrossed className="w-4 h-4 mr-2 text-thrivv-neon-green" />
                          Habits
                        </span>
                        <span className="text-thrivv-text-primary font-semibold">{healthScore.habit_score}/10</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-thrivv-text-secondary text-sm flex items-center">
                          <Activity className="w-4 h-4 mr-2 text-thrivv-gold-400" />
                          Recovery
                        </span>
                        <span className="text-thrivv-text-primary font-semibold">{healthScore.recovery_score ?? "—"}/20</span>
                      </div>
                    </div>

                    {/* Confidence Score Badge */}
                    {confidenceScore && (
                      <div className="w-full pt-6 mt-6 border-t border-thrivv-gold-500/10">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-thrivv-text-secondary text-sm flex items-center">
                            <Shield className="w-4 h-4 mr-2 text-thrivv-gold-500" />
                            Data Confidence
                          </span>
                          <span className="text-thrivv-text-primary font-semibold">{confidenceScore.score}/100</span>
                        </div>
                        <div className="flex items-center justify-center mb-2">
                          <ConfidenceBadge 
                            level={confidenceScore.level} 
                            score={confidenceScore.score}
                            showScore={false}
                            size="md"
                          />
                        </div>
                        <p className="text-xs text-thrivv-text-muted text-center">
                          Data confidence is separate from Health Score.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 text-thrivv-text-muted mx-auto mb-4 animate-pulse" />
                    <p className="text-thrivv-text-secondary mb-4">No score yet</p>
                    <Link
                      href="/member/checkin"
                      className="text-thrivv-gold-500 hover:text-thrivv-gold-400 text-sm font-medium"
                    >
                      Complete your first check-in →
                    </Link>
                  </div>
                )}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-2 min-w-0">
            <div className="premium-card relative overflow-hidden shadow-[0_30px_120px_-40px_rgba(255,208,0,0.16)]">
              <div
                className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/40 to-transparent"
                aria-hidden
              />
              <div
                className="absolute -top-24 -left-24 w-56 h-56 bg-thrivv-gold-500/10 rounded-full blur-3xl pointer-events-none"
                aria-hidden
              />
              <div className="relative px-6 py-5 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-thrivv-text-primary flex items-center">
                  <Trophy className="w-5 h-5 mr-3 text-thrivv-gold-500" />
                  Weekly Gym Leaderboard
                </h2>
                <span className="text-[10px] uppercase tracking-[0.25em] text-thrivv-text-muted">Top 10</span>
              </div>
              <div className="divider" />
              <div className="p-6">
                {board?.hasGym === false ? <p className="text-thrivv-text-secondary">Join a gym to view your leaderboard.</p> : (
                  <>
                    <p className="mb-4 text-sm text-thrivv-text-secondary">
                      {board?.weekStart} – {board?.weekEnd} · {board?.timezone}. Total of completed daily Health Scores, Monday–Sunday.
                      Missing or incomplete days add no points until completed. These are leaderboard scores, not redeemable points.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-sm text-left">
                        <thead className="text-thrivv-text-muted"><tr>{['Rank', 'Member', 'Weekly total /770', 'Training /560', 'Recovery /140', 'Habits /70', 'Days scored'].map(label => <th key={label} className="p-3 font-medium">{label}</th>)}</tr></thead>
                        <tbody>{leaderboard.map(entry => <tr key={entry.id} className={entry.id === user.id ? 'bg-thrivv-gold-500/10 text-thrivv-gold-500' : 'text-thrivv-text-primary'}>
                          <td className="p-3">{entry.rank}</td><td className="p-3">{entry.name}{entry.id === user.id ? ' · You' : ''}</td>
                          <td className="p-3 font-semibold">{entry.score}</td><td className="p-3">{entry.training_score}</td><td className="p-3">{entry.recovery_score}</td><td className="p-3">{entry.habit_score}</td><td className="p-3">{entry.scored_days}/7</td>
                        </tr>)}</tbody>
                      </table>
                    </div>
                    {!leaderboard.length && <p className="text-thrivv-text-secondary py-4">No complete daily scores this week yet.</p>}
                    {board?.pendingCount > 0 && <div className="mt-4 border-t border-thrivv-gold-500/10 pt-4 text-sm text-thrivv-text-muted">
                      <p>{board.pendingCount} members without a complete score this week — not ranked</p>
                      <p className="mt-2">{board.pending.map((p: { name: string }) => p.name).join(', ')}</p>
                    </div>}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        </Reveal>

        {/* Main Feature Cards */}
        <Reveal delay={200}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Daily Check-in */}
          <Link
            href="/member/checkin"
            className="premium-card p-8 group cursor-pointer"
          >
            <div className="icon-badge mb-6">
              <CheckCircle className="w-6 h-6 text-thrivv-gold-500" />
            </div>
            <h3 className="text-xl font-semibold text-thrivv-text-primary mb-2">Daily Check-in</h3>
            <p className="text-thrivv-text-secondary text-sm mb-6">
              Track habits and review today’s score
            </p>
            <div className="flex items-center text-thrivv-gold-500 font-medium text-sm group-hover:translate-x-1 transition-transform">
              {todayCheckin ? 'Update' : 'Complete'} →
            </div>
          </Link>

          {/* Score History */}
          <div className="premium-card p-8">
            <div className="icon-badge mb-6">
              <Activity className="w-6 h-6 text-thrivv-neon-green" />
            </div>
            <h3 className="text-xl font-semibold text-thrivv-text-primary mb-2">7-Day Trend</h3>
            <p className="text-thrivv-text-secondary text-sm mb-6">
              {scoreHistory.length > 0 
                ? `${scoreHistory.length} day${scoreHistory.length !== 1 ? 's' : ''} tracked` 
                : 'Start tracking progress'}
            </p>
            {scoreHistory.length > 0 && (
              <div className="flex items-center space-x-1.5">
                {scoreHistory.map((score, idx) => (
                  <div
                    key={idx}
                    className="flex-1 bg-thrivv-bg-card rounded-full h-2 overflow-hidden"
                    title={`${new Date(`${score.date}T12:00:00`).toLocaleDateString()}: ${score.score}`}
                  >
                    <div
                      className={`h-full ${
                        (score.score ?? 0) >= 80 ? 'bg-thrivv-neon-green' : 'bg-thrivv-gold-500'
                      }`}
                      style={{ width: `${(score.score ?? 0) / 110 * 100}%` }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard Rank */}
          <div className="premium-card p-8 bg-thrivv-gold-500/5 border-thrivv-gold-500/20">
            <div className="icon-badge mb-6">
              <Trophy className="w-6 h-6 text-thrivv-gold-500" />
            </div>
            <h3 className="text-xl font-semibold text-thrivv-text-primary mb-2">Your Weekly Rank</h3>
            {leaderboard.length > 0 ? (
              <>
                <p className="text-thrivv-text-secondary text-sm mb-6">
                  {userRank !== null
                    ? `#${userRank} of ${board?.rankedCount ?? 0}`
                    : 'Awaiting a complete Health Score'}
                </p>
                <div className="flex items-center text-thrivv-gold-500 font-medium text-sm">
                  View leaderboard →
                </div>
              </>
            ) : (
              <p className="text-thrivv-text-secondary text-sm">
                No rankings yet
              </p>
            )}
          </div>
        </div>
        </Reveal>

        {/* Score History Detail */}
        {scoreHistory.length > 0 && (
          <Reveal delay={280}>
          <div className="premium-card relative overflow-hidden shadow-[0_30px_120px_-40px_rgba(255,208,0,0.14)]">
            <div
              className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/40 to-transparent"
              aria-hidden
            />
            <div className="relative px-6 py-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-thrivv-text-primary flex items-center">
                <Calendar className="w-5 h-5 mr-3 text-thrivv-gold-500" />
                Recent Scores
              </h2>
              <span className="text-[10px] uppercase tracking-[0.25em] text-thrivv-text-muted">Last {scoreHistory.length} days</span>
            </div>
            <div className="divider" />
            <div className="p-6">
              <div className="space-y-3">
                {scoreHistory.slice().reverse().map((score) => (
                  <div
                    key={score.date}
                    className="flex items-center justify-between p-4 bg-thrivv-bg-card/30 rounded-xl"
                  >
                    <div className="flex items-center space-x-6">
                      <div className="text-thrivv-text-secondary text-sm min-w-[100px]">
                        {new Date(`${score.date}T12:00:00`).toLocaleDateString('en-US', {
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-thrivv-text-muted">
                        <span className="flex items-center">
                          <Dumbbell className="w-3 h-3 mr-1.5 text-thrivv-gold-500" />
                          {score.training_score}
                        </span>
                        <span className="flex items-center">
                          <UtensilsCrossed className="w-3 h-3 mr-1.5 text-thrivv-neon-green" />
                          {score.habit_score}
                        </span>
                        <span className="flex items-center">
                          <Activity className="w-3 h-3 mr-1.5 text-thrivv-gold-400" />
                          {score.recovery_score}
                        </span>
                      </div>
                    </div>
                    <div className={`text-2xl font-semibold ${
                      (score.score ?? 0) >= 80 ? 'text-thrivv-neon-green' : 'text-thrivv-gold-500'
                    }`}>
                      {score.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </Reveal>
        )}
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function HudTile({
  icon: Icon,
  label,
  value,
  sub,
  accent = 'gold',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent?: 'gold' | 'green' | 'muted';
}) {
  const accentClasses =
    accent === 'green'
      ? 'bg-thrivv-neon-green/10 border-thrivv-neon-green/30 text-thrivv-neon-green'
      : accent === 'muted'
        ? 'bg-thrivv-bg-card border-thrivv-gold-500/10 text-thrivv-text-muted'
        : 'bg-thrivv-gold-500/10 border-thrivv-gold-500/25 text-thrivv-gold-500';

  return (
    <div className="flex items-center gap-4 lg:gap-5 lg:px-5 first:lg:pl-0 last:lg:pr-0">
      <div
        className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${accentClasses}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.25em] text-thrivv-text-muted leading-none mb-1.5">
          {label}
        </div>
        <div className={`${value.length > 12 ? "text-lg" : "text-2xl lg:text-[1.75rem]"} font-semibold tracking-tighter leading-tight text-thrivv-text-primary tabular-nums break-words`}>
          {value}
        </div>
        {sub ? (
          <div title={sub} className="mt-1.5 text-[10px] text-thrivv-text-muted">
            {sub}
          </div>
        ) : null}
      </div>
    </div>
  );
}
