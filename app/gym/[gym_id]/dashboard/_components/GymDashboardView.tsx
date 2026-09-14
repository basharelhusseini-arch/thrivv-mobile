import Link from 'next/link';
import GymWorkspace from '../../_components/GymWorkspace';
import GymHeader from './GymHeader';
import Week4RetentionCard from './Week4RetentionCard';
import StreakLeaderboard from './StreakLeaderboard';
import EngagementChart from './EngagementChart';


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
  verified_visitors?: { value: number | null; status: string };
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
  return <GymWorkspace gym={data.gym} current="dashboard" title="Your gym, at a glance" description="Follow your community’s workout consistency and reward activity in one place.">
    <GymHeader data={data} />
    <div className="grid gap-5 md:grid-cols-2">
      <Link href={`/gym/${data.gym.id}/members`} className="group dark-card p-6 space-y-3 transition-colors hover:border-thrivv-gold-500/30">
        <p className="text-xs uppercase tracking-widest text-thrivv-gold-500">Your community</p>
        <h2 className="text-xl font-semibold">Get to know your members <span className="inline-block transition-transform group-hover:translate-x-1" aria-hidden>→</span></h2>
        <p className="text-sm leading-relaxed text-thrivv-text-secondary">Find members, see when they joined, and check their latest verified workout.</p>
      </Link>
      <Link href={`/gym/${data.gym.id}/activity`} className="group dark-card p-6 space-y-3 transition-colors hover:border-thrivv-gold-500/30">
        <p className="text-xs uppercase tracking-widest text-thrivv-gold-500">Verified activity</p>
        <h2 className="text-xl font-semibold">See who’s showing up <span className="inline-block transition-transform group-hover:translate-x-1" aria-hidden>→</span></h2>
        <p className="text-sm leading-relaxed text-thrivv-text-secondary">Accepted gym QR verifications and each member’s daily credited points.</p>
      </Link>
    </div>
    {data.totals.total_members === 0 && <section className="rounded-2xl border border-thrivv-gold-500/20 bg-thrivv-gold-500/[0.04] p-6 flex flex-wrap items-center justify-between gap-5"><div><h2 className="font-semibold">Welcome your first members</h2><p className="mt-2 text-sm text-thrivv-text-secondary">Share your joining code or a private invitation link to get started.</p></div><Link href={`/gym/${data.gym.id}/invite`} className="btn-primary px-5 py-3 text-sm">Invite members</Link></section>}
    <details className="rounded-2xl border border-white/10 bg-white/[0.02]">
      <summary className="cursor-pointer p-5 text-sm font-medium text-thrivv-text-primary">Check-in trends &amp; returning members <span className="ml-2 text-thrivv-text-muted">{data.totals.active_this_week} members checked in this week</span></summary>
      <div className="border-t border-white/10 p-4 sm:p-5 space-y-5">
        <p className="text-xs leading-relaxed text-thrivv-text-muted">{data.activity_definition}</p>
        {data.unknown_membership_dates > 0 && <p className="text-xs text-thrivv-text-muted">{data.unknown_membership_dates} member(s) have no recorded gym joining date. Their past check-ins are excluded here.</p>}
        <EngagementChart data={data.daily_checkins_30d} />
        <div className="grid gap-5 lg:grid-cols-2"><Week4RetentionCard data={data} /><StreakLeaderboard rows={data.streak_leaderboard} /></div>
      </div>
    </details>
  </GymWorkspace>;
}
