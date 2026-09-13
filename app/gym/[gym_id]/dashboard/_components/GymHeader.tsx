'use client';
import Link from 'next/link';
import GymJoinCode from '@/components/GymJoinCode';
import type { GymAnalytics } from './GymDashboardView';

export default function GymHeader({ data }: { data: GymAnalytics }) {
  return <header className="space-y-6">
    <section className="glass-card p-6 sm:p-8 lg:p-12 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.28em] text-thrivv-gold-500">Thrivv / Gym dashboard</p>
        <Link href="/gym" className="text-sm text-thrivv-text-secondary hover:text-thrivv-gold-500">Gym portal →</Link>
      </div>
      <h1 className="text-balance break-words text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tighter text-thrivv-text-primary">{data.gym.name}</h1>
      <GymJoinCode gymId={data.gym.id} />
    </section>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <Metric title="Total members" value={data.totals.total_members.toLocaleString()} description="Registered accounts in your gym" />
      <Metric title="Active members · 7 days" value={data.totals.active_this_week.toLocaleString()} description="Members who submitted a daily check-in" />
      <Metric title="Points accumulated" value={data.earned_points.status === 'available' ? String(data.earned_points.value) : data.earned_points.status === 'unavailable' ? 'Unavailable' : 'Not activated'} description={data.earned_points.reason} />
      <Metric title="Verified scans" value={data.verified_scans.status === 'available' ? String(data.verified_scans.total) : data.verified_scans.status === 'unavailable' ? 'Unavailable' : 'Not activated'} description={`${data.verified_scans.reason} Last 7 days: ${data.verified_scans.last_seven_days ?? 'Unavailable'}`} />
    </div>
  </header>;
}
function Metric({ title, value, description }: { title: string; value: string; description: string }) {
  return <section className="dark-card p-6 space-y-3 min-w-0">
    <h2 className="text-xs uppercase tracking-widest text-thrivv-text-muted">{title}</h2>
    <p className="text-3xl font-semibold tracking-tight text-thrivv-gold-500">{value}</p>
    <p className="text-sm text-thrivv-text-secondary">{description}</p>
  </section>;
}
