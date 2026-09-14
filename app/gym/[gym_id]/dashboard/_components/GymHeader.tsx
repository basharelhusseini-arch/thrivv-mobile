import type { GymAnalytics } from './GymDashboardView';

export default function GymHeader({ data }: { data: GymAnalytics }) {
  return <section aria-label="Gym metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
    <Metric title="Members on Thrivv" value={data.totals.total_members.toLocaleString()} description="Current members connected to your gym" />
    <Metric title="Unique verified visitors" value={data.verified_visitors?.value === null || data.verified_visitors?.value === undefined ? 'Unavailable' : data.verified_visitors.value.toLocaleString()} description="Distinct members with an accepted verification in the last 7 days" />
    <Metric title="Verified workouts" value={data.verified_scans.total === null ? 'Unavailable' : data.verified_scans.total.toLocaleString()} description={`All-time accepted verifications · ${data.verified_scans.last_seven_days ?? '—'} in the last 7 days`} />
    <Metric title="Points awarded" value={data.earned_points.value === null ? 'Unavailable' : data.earned_points.value.toLocaleString()} description="Net daily earnings attributed to your gym. Spending does not reduce this total." />
  </section>;
}
function Metric({ title, value, description }: { title: string; value: string; description: string }) {
  return <section className="dark-card p-5 space-y-3 min-w-0 border-t border-t-thrivv-gold-500/20">
    <h2 className="text-xs font-medium text-thrivv-text-secondary">{title}</h2>
    <p className="text-3xl font-semibold tracking-tight tabular-nums text-thrivv-gold-500">{value}</p>
    <p className="text-xs leading-relaxed text-thrivv-text-muted">{description}</p>
  </section>;
}
