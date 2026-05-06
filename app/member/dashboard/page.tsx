'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, Users, CreditCard, LogOut, User, BookOpen, CheckCircle, Bell, DollarSign, Dumbbell, UtensilsCrossed, Target, Activity, Watch, Trophy, AlertCircle, Shield, TrendingUp } from 'lucide-react';
import ConfidenceBadge from '@/components/ConfidenceBadge';
import { ConfidenceLevel } from '@/types';
import PageHeader, { gradient } from '@/components/PageHeader';
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
  score: number;
  training_score: number;
  diet_score: number;
  sleep_score: number;
  created_at: string;
}

interface LeaderboardEntry {
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

        // Fetch today's health score
        const refetchScore = async () => {
          const r = await fetch('/api/score/today', { cache: 'no-store' });
          if (r.ok) {
            const d = await r.json();
            setHealthScore(d.score);
          }
        };
        await refetchScore();

        // Auto-sync WHOOP for today (debounced per session). Silent —
        // the dashboard stays usable if WHOOP is offline or the user
        // isn't connected.
        void ensureWhoopAutoSync({ onSynced: refetchScore });

        // Fetch score history (last 7 days)
        const historyRes = await fetch('/api/score/history?days=7');
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setScoreHistory(historyData.history || []);
        }

        // Fetch leaderboard
        const leaderboardRes = await fetch('/api/leaderboard');
        if (leaderboardRes.ok) {
          const leaderboardData = await leaderboardRes.json();
          setLeaderboard(leaderboardData.leaderboard || []);
        }

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
  const sevenDayAvg =
    scoreHistory.length > 0
      ? Math.round(
          scoreHistory.reduce((sum, h) => sum + h.score, 0) / scoreHistory.length
        )
      : null;
  const userRankIndex = leaderboard.findIndex((e) => e.id === user.id);
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : null;
  const todayCheckedIn = !!todayCheckin;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={"Today\u2019s snapshot"}
        titleNode={<>Welcome back, {gradient(userDisplayName)}</>}
        subtitle={
          "Your training, nutrition, and sleep \u2014 distilled into one Health Score that ranks you on your gym\u2019s leaderboard."
        }
        action={
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-thrivv-neon-green/30 bg-thrivv-neon-green/5 text-thrivv-neon-green text-[10px] uppercase tracking-[0.25em]">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inset-0 rounded-full bg-thrivv-neon-green opacity-70 animate-ping" />
              <span className="relative w-1.5 h-1.5 rounded-full bg-thrivv-neon-green" />
            </span>
            Live
          </span>
        }
      />

      <main className="space-y-8">
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
                label="Today"
                value={todayValue !== null ? String(todayValue) : '\u2014'}
                sub="Health Score"
                accent={todayValue !== null && todayValue >= 80 ? 'green' : 'gold'}
              />
              <HudTile
                icon={TrendingUp}
                label="7-day avg"
                value={sevenDayAvg !== null ? String(sevenDayAvg) : '\u2014'}
                sub={
                  scoreHistory.length > 0
                    ? `${scoreHistory.length} day${scoreHistory.length === 1 ? '' : 's'} tracked`
                    : 'Start tracking'
                }
              />
              <HudTile
                icon={Trophy}
                label="Rank"
                value={userRank !== null ? `#${userRank}` : '\u2014'}
                sub={
                  leaderboard.length > 0
                    ? `of ${leaderboard.length}`
                    : 'No leaderboard yet'
                }
              />
              <HudTile
                icon={todayCheckedIn ? CheckCircle : AlertCircle}
                label="Status"
                value={todayCheckedIn ? 'Checked in' : 'Pending'}
                sub={todayCheckedIn ? 'Today complete' : 'Log today\u2019s check-in'}
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
                    Log your workout, calories, and sleep
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
                    {/* Total Rewards Score (if confidence score available) */}
                    {confidenceScore && (() => {
                      const multiplier = 1 + ((confidenceScore.score - 30) / 100) * 0.25;
                      const totalScore = Math.round(healthScore.score * multiplier);
                      return (
                        <div className="w-full mb-6 p-4 bg-gradient-to-br from-thrivv-gold-500/10 to-thrivv-gold-500/10 border border-thrivv-gold-500/30 rounded-xl">
                          <div className="text-center">
                            <p className="text-xs text-thrivv-text-muted mb-2 uppercase tracking-wide">Rewards Score</p>
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <Trophy className="w-5 h-5 text-thrivv-gold-500" />
                              <p className="text-3xl font-bold text-thrivv-gold-500">{totalScore}</p>
                            </div>
                            <p className="text-xs text-thrivv-text-muted">
                              {healthScore.score} × {multiplier.toFixed(2)}x confidence
                            </p>
                          </div>
                        </div>
                      );
                    })()}

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
                          strokeDashoffset={`${2 * Math.PI * 72 * (1 - healthScore.score / 100)}`}
                          className={`transition-all duration-1000 ${
                            healthScore.score >= 80 ? 'text-thrivv-neon-green' : 'text-thrivv-gold-500'
                          }`}
                          strokeLinecap="round"
                        />
                      </svg>
                      {/* Score Number */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className={`text-6xl font-semibold tracking-tighter leading-none ${
                          healthScore.score >= 80 ? 'text-thrivv-neon-green' : 'text-thrivv-gold-500'
                        }`}>
                          {healthScore.score}
                        </div>
                        <div className="mt-1.5 text-thrivv-text-muted text-[10px] uppercase tracking-[0.25em]">Health Score</div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-thrivv-text-muted text-center mb-6">
                      Your health behavior score
                    </p>

                    {/* Score Breakdown */}
                    <div className="w-full space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-thrivv-text-secondary text-sm flex items-center">
                          <Dumbbell className="w-4 h-4 mr-2 text-thrivv-gold-500" />
                          Training
                        </span>
                        <span className="text-thrivv-text-primary font-semibold">{healthScore.training_score}/30</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-thrivv-text-secondary text-sm flex items-center">
                          <UtensilsCrossed className="w-4 h-4 mr-2 text-thrivv-neon-green" />
                          Diet
                        </span>
                        <span className="text-thrivv-text-primary font-semibold">{healthScore.diet_score}/40</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-thrivv-text-secondary text-sm flex items-center">
                          <Activity className="w-4 h-4 mr-2 text-thrivv-gold-400" />
                          Sleep
                        </span>
                        <span className="text-thrivv-text-primary font-semibold">{healthScore.sleep_score}/30</span>
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
                          Boosts your rewards by {Math.round(((confidenceScore.score - 30) / 100) * 25)}%
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
          <div className="lg:col-span-2">
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
                  Leaderboard
                </h2>
                <span className="text-[10px] uppercase tracking-[0.25em] text-thrivv-text-muted">Top 10</span>
              </div>
              <div className="divider" />
              <div className="p-6">
                {leaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboard.slice(0, 10).map((entry, index) => {
                      const isCurrentUser = entry.id === user?.id;
                      const rank = index + 1;
                      return (
                        <div
                          key={entry.id}
                          className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
                            isCurrentUser 
                              ? 'bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 glow-gold' 
                              : 'bg-thrivv-bg-card/30 hover:bg-thrivv-bg-card/60 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            {/* Rank Badge */}
                            <div className={`flex items-center justify-center w-10 h-10 rounded-xl font-semibold ${
                              rank === 1 ? 'bg-thrivv-gold-500/20 text-thrivv-gold-500' :
                              rank === 2 ? 'bg-thrivv-text-secondary/20 text-thrivv-text-secondary' :
                              rank === 3 ? 'bg-thrivv-gold-500/20 text-thrivv-gold-500' :
                              'bg-thrivv-bg-card text-thrivv-text-muted'
                            }`}>
                              {rank <= 3 ? (rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉') : rank}
                            </div>
                            
                            {/* User Name */}
                            <div>
                              <p className={`font-medium ${isCurrentUser ? 'text-thrivv-gold-500' : 'text-thrivv-text-primary'}`}>
                                {entry.name}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs bg-thrivv-gold-500/20 text-thrivv-gold-500 px-2 py-0.5 rounded-md">
                                    You
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Score */}
                          <div className="text-right">
                            <div className={`text-2xl font-semibold ${
                              entry.score >= 80 ? 'text-thrivv-neon-green' : 'text-thrivv-gold-500'
                            }`}>
                              {entry.score}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-thrivv-text-muted mx-auto mb-4" />
                    <p className="text-thrivv-text-secondary text-sm">No leaderboard data yet</p>
                  </div>
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
              Log workout, calories & sleep
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
                    title={`${new Date(score.date).toLocaleDateString()}: ${score.score}`}
                  >
                    <div
                      className={`h-full ${
                        score.score >= 80 ? 'bg-thrivv-neon-green' : 'bg-thrivv-gold-500'
                      }`}
                      style={{ width: `${score.score}%` }}
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
            <h3 className="text-xl font-semibold text-thrivv-text-primary mb-2">Your Rank</h3>
            {leaderboard.length > 0 ? (
              <>
                <p className="text-thrivv-text-secondary text-sm mb-6">
                  {leaderboard.findIndex(e => e.id === user?.id) !== -1
                    ? `#${leaderboard.findIndex(e => e.id === user?.id) + 1} of ${leaderboard.length}`
                    : 'Complete check-in to rank'}
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
                    key={score.id}
                    className="flex items-center justify-between p-4 bg-thrivv-bg-card/30 rounded-xl"
                  >
                    <div className="flex items-center space-x-6">
                      <div className="text-thrivv-text-secondary text-sm min-w-[100px]">
                        {new Date(score.date).toLocaleDateString('en-US', { 
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
                          {score.diet_score}
                        </span>
                        <span className="flex items-center">
                          <Activity className="w-3 h-3 mr-1.5 text-thrivv-gold-400" />
                          {score.sleep_score}
                        </span>
                      </div>
                    </div>
                    <div className={`text-2xl font-semibold ${
                      score.score >= 80 ? 'text-thrivv-neon-green' : 'text-thrivv-gold-500'
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
        <div className="text-2xl lg:text-[1.75rem] font-semibold tracking-tighter leading-none text-thrivv-text-primary tabular-nums">
          {value}
        </div>
        {sub ? (
          <div className="mt-1.5 text-[10px] text-thrivv-text-muted truncate">
            {sub}
          </div>
        ) : null}
      </div>
    </div>
  );
}
