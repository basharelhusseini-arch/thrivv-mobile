'use client';

import { Building2, CalendarDays, Users, Target } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import type { GymAnalytics } from './GymDashboardView';

function formatDateRange(from: string, to: string): string {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  return `${fmt(from)} – ${fmt(to)}`;
}

export default function GymHeader({ data }: { data: GymAnalytics }) {
  const { gym, pilot_week_number, totals, date_range } = data;
  return (
    <section className="relative animate-fade-in-up">
      <div className="glass-card relative overflow-hidden p-8 lg:p-12">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-thrivv-gold-500/50 to-transparent" />
        {/* Soft corner glow */}
        <div className="absolute -top-32 -right-24 w-72 h-72 bg-thrivv-gold-500/12 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 relative">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-thrivv-gold-500/20 bg-thrivv-gold-500/5 text-thrivv-gold-500 text-[10px] uppercase tracking-[0.28em] mb-5">
              <Building2 className="w-3 h-3" />
              Gym Owner Dashboard
            </div>
            <h1 className="text-balance text-4xl sm:text-5xl lg:text-[3.25rem] xl:text-[3.5rem] font-semibold text-thrivv-text-primary tracking-tighter leading-[1.02] mb-5">
              {gym.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {pilot_week_number !== null && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 text-thrivv-gold-500 text-xs font-medium">
                  <Target className="w-3.5 h-3.5" />
                  Pilot Week {pilot_week_number}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-thrivv-bg-card border border-thrivv-gold-500/10 text-thrivv-text-secondary text-xs">
                <CalendarDays className="w-3.5 h-3.5 text-thrivv-text-muted" />
                {formatDateRange(date_range.from, date_range.to)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <Tile label="Members" value={totals.total_members} icon={<Users className="w-4 h-4" />} />
            <Tile label="Pilot Cohort" value={totals.pilot_member_count} />
            <Tile label="Active 7d" value={totals.active_this_week} accent />
          </div>
        </div>
      </div>
    </section>
  );
}

function Tile({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`group/tile relative min-w-[110px] rounded-xl px-4 py-3 border transition-all duration-300 hover:-translate-y-0.5 ${
        accent
          ? 'bg-thrivv-gold-500/10 border-thrivv-gold-500/30 hover:shadow-[0_0_24px_rgba(255,208,0,0.18)]'
          : 'bg-thrivv-bg-card/60 border-thrivv-gold-500/10 hover:border-thrivv-gold-500/30'
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-thrivv-text-muted mb-1">
        {icon}
        {label}
      </div>
      <AnimatedNumber
        value={value}
        className={`block text-2xl font-semibold tabular-nums ${
          accent ? 'text-thrivv-gold-500' : 'text-thrivv-text-primary'
        }`}
      />
    </div>
  );
}
