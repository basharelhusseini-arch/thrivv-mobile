'use client';

import GymInvitation from './GymInvitation';
import GymWorkoutQr from '@/components/GymWorkoutQr';
import GymHeader from './GymHeader';
import Week4RetentionCard from './Week4RetentionCard';
import ActiveThisWeekCard from './ActiveThisWeekCard';
import StreakLeaderboard from './StreakLeaderboard';
import EngagementChart from './EngagementChart';
import RecentActivityFeed from './RecentActivityFeed';
import Reveal from '@/components/Reveal';

export type GymAnalytics = {
  gym: {
    id: string;
    name: string;
    owner_email: string;
    pilot_start_date: string | null;
    pilot_member_count: number;
    created_at: string;
  };
  pilot_week_number: number | null;
  date_range: { from: string; to: string };
  totals: {
    total_members: number;
    pilot_member_count: number;
    active_this_week: number;
    active_this_week_pct: number;
    active_prev_week: number;
  };
  activity_definition: string;
  unknown_membership_dates: number;
  earned_points: { status: string; value: number | null; reason: string };
  verified_scans: { status: string; total: number | null; last_seven_days: number | null; reason: string };
  week4_retention: {
    eligible: number;
    retained: number;
    rate_pct: number;
  } | null;
  streak_leaderboard: Array<{
    user_id: string;
    name: string;
    email: string;
    current_streak: number;
    last_checkin_date: string | null;
  }>;
  daily_checkins_30d: Array<{ date: string; count: number }>;
  recent_activity: Array<{ id: string; user_id: string; name: string; date: string; created_at: string }>;
  viewer: { is_admin: boolean; is_owner: boolean };
};

export default function GymDashboardView({ data }: { data: GymAnalytics }) {
  return (
    <div className="min-h-screen bg-thrivv-bg-darker relative overflow-hidden">
      {/* Layer 1: faint grid pattern */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,208,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,208,0,0.6) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage:
            'radial-gradient(ellipse at center, black 35%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at center, black 35%, transparent 75%)',
        }}
      />
      {/* Layer 2: slow vertical scan line */}
      <div
        className="pointer-events-none fixed inset-x-0 h-px opacity-30"
        aria-hidden
        style={{
          top: 0,
          background:
            'linear-gradient(90deg, transparent, rgba(255,208,0,0.6), transparent)',
          animation: 'gym-scan 9s linear infinite',
        }}
      />
      {/* Layer 3: ambient gold blobs */}
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute -top-1/3 -left-1/3 w-[60vw] h-[60vw] bg-thrivv-gold-500/5 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-1/3 -right-1/3 w-[60vw] h-[60vw] bg-thrivv-gold-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: '1.5s' }}
        />
      </div>
      <style jsx>{`
        @keyframes gym-scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(60vh); }
          100% { transform: translateY(0); }
        }
      `}</style>

      <main className="relative max-w-7xl mx-auto px-6 lg:px-10 py-10 lg:py-14 space-y-10">
        <GymHeader data={data} />
        <p className="text-sm text-thrivv-text-secondary">{data.activity_definition}</p>
        {data.unknown_membership_dates > 0 && <p className="text-sm text-thrivv-text-secondary">{data.unknown_membership_dates} member(s) have no recorded gym membership start date. Their past check-ins are excluded from engagement metrics.</p>}
        <GymInvitation gymId={data.gym.id} />
        <GymWorkoutQr key={data.gym.id} gymId={data.gym.id} />

        <Reveal delay={100}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Week4RetentionCard data={data} />
            </div>
            <div>
              <ActiveThisWeekCard data={data} />
            </div>
          </div>
        </Reveal>

        <Reveal delay={180}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <EngagementChart data={data.daily_checkins_30d} />
            </div>
            <div>
              <StreakLeaderboard rows={data.streak_leaderboard} />
            </div>
          </div>
        </Reveal>

        <Reveal delay={260}>
          <RecentActivityFeed rows={data.recent_activity} />
        </Reveal>
      </main>
    </div>
  );
}
