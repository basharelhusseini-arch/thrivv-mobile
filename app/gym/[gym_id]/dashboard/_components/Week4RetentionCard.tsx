import type { GymAnalytics } from './GymDashboardView';

export default function Week4RetentionCard({ data }: { data: GymAnalytics }) {
  const retention = data.week4_retention;
  return <section className="dark-card p-6 space-y-4">
    <h2 className="text-lg font-semibold">Week 4 check-in return</h2>
    {retention ? <><p className="text-4xl font-semibold tabular-nums text-thrivv-gold-500">{retention.rate_pct}%</p><p className="text-sm text-thrivv-text-secondary">{retention.retained} of {retention.eligible} eligible members checked in during their fourth week.</p></> : <p className="text-sm text-thrivv-text-secondary">This will appear when members have completed their first 28 days.</p>}
    <p className="text-xs leading-relaxed text-thrivv-text-muted">Members with a recorded joining date in the last 90 days who have completed day 28. Returning means submitting a daily check-in on days 22–28; this does not measure membership renewals or verified gym visits.</p>
  </section>;
}
