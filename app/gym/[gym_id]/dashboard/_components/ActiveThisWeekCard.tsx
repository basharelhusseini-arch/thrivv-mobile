'use client';

import { Activity, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import type { GymAnalytics } from './GymDashboardView';

export default function ActiveThisWeekCard({ data }: { data: GymAnalytics }) {
  const { totals } = data;
  const delta = totals.active_this_week - totals.active_prev_week;
  const trend: 'up' | 'down' | 'flat' =
    delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  const trendColor =
    trend === 'up'
      ? 'text-thrivv-neon-green bg-thrivv-neon-green/10 border-thrivv-neon-green/20'
      : trend === 'down'
      ? 'text-red-400 bg-red-500/10 border-red-500/20'
      : 'text-thrivv-text-muted bg-thrivv-bg-card border-thrivv-gold-500/10';

  return (
    <div className="premium-card h-full p-8 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 text-thrivv-text-muted text-xs uppercase tracking-widest">
            <Activity className="w-3.5 h-3.5 text-thrivv-gold-500" />
            Active This Week
          </div>
          <span className="relative inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-thrivv-neon-green">
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-thrivv-neon-green opacity-75 animate-ping" />
              <span className="relative w-2 h-2 rounded-full bg-thrivv-neon-green" />
            </span>
            Live
          </span>
        </div>
        <h2 className="text-base font-semibold text-thrivv-text-primary">
          Members logged in last 7 days
        </h2>
      </div>

      <div className="my-6">
        <div className="flex items-baseline gap-3">
          <AnimatedNumber
            value={totals.active_this_week}
            className="text-6xl font-semibold text-thrivv-text-primary tabular-nums leading-none"
          />
          <span className="text-thrivv-text-secondary text-lg">
            / {totals.total_members}
          </span>
        </div>
        <div className="text-sm text-thrivv-text-secondary mt-3">
          <AnimatedNumber value={totals.active_this_week_pct} />% of total members
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-thrivv-gold-500/10">
        <div className="text-xs text-thrivv-text-muted">
          Previous 7 days: {totals.active_prev_week}
        </div>
        <div
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium ${trendColor}`}
        >
          <TrendIcon className="w-3.5 h-3.5" />
          {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : 'flat'}
        </div>
      </div>
    </div>
  );
}
