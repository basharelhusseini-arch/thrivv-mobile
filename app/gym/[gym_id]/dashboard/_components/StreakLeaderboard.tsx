'use client';

import { Flame, Trophy } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';

type Row = {
  user_id: string;
  name: string;
  email: string;
  current_streak: number;
  last_checkin_date: string | null;
};

function relativeDate(d: string | null): string {
  if (!d) return '—';
  const days = Math.round(
    (Date.parse(new Date().toISOString().slice(0, 10) + 'T00:00:00Z') -
      Date.parse(d + 'T00:00:00Z')) /
      (24 * 60 * 60 * 1000),
  );
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function StreakLeaderboard({ rows }: { rows: Row[] }) {
  const has = rows.length > 0 && rows.some((r) => r.current_streak > 0);

  return (
    <div className="premium-card h-full">
      <div className="flex items-center justify-between px-6 py-5">
        <h2 className="flex items-center text-lg font-semibold text-thrivv-text-primary">
          <Trophy className="w-5 h-5 mr-2.5 text-thrivv-gold-500" />
          Streak Leaders
        </h2>
        <span className="text-xs text-thrivv-text-muted uppercase tracking-widest">
          Top 10
        </span>
      </div>
      <div className="divider" />
      <div className="p-4">
        {has ? (
          <ul className="space-y-1.5">
            {rows
              .filter((r) => r.current_streak > 0)
              .slice(0, 10)
              .map((r, i) => {
                const rank = i + 1;
                const isTop = rank === 1;
                return (
                  <li
                    key={r.user_id}
                    className={`group flex items-center justify-between gap-3 p-3 rounded-xl transition-all duration-200 hover:translate-x-0.5 ${
                      isTop
                        ? 'bg-thrivv-gold-500/10 border border-thrivv-gold-500/30 glow-gold'
                        : 'bg-thrivv-bg-card/40 hover:bg-thrivv-bg-card/70 border border-transparent'
                    }`}
                    style={{
                      opacity: 0,
                      animation:
                        'gym-row-in 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
                      animationDelay: `${i * 70}ms`,
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex items-center justify-center w-9 h-9 rounded-lg text-sm font-semibold shrink-0 ${
                          rank <= 3
                            ? 'bg-thrivv-gold-500/15 text-thrivv-gold-500'
                            : 'bg-thrivv-bg-card text-thrivv-text-muted'
                        }`}
                      >
                        {MEDAL[rank] ?? rank}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-thrivv-text-primary truncate">
                          {r.name}
                        </div>
                        <div className="text-[11px] text-thrivv-text-muted truncate">
                          last check-in {relativeDate(r.last_checkin_date)}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-semibold ${
                        isTop
                          ? 'text-thrivv-gold-500'
                          : 'text-thrivv-text-primary'
                      }`}
                    >
                      <Flame
                        className={`w-4 h-4 ${
                          isTop
                            ? 'text-thrivv-gold-500 drop-shadow-[0_0_6px_rgba(255,208,0,0.6)]'
                            : 'text-thrivv-gold-400'
                        }`}
                      />
                      <AnimatedNumber
                        value={r.current_streak}
                        durationMs={900 + i * 50}
                        className="tabular-nums"
                      />
                    </div>
                  </li>
                );
              })}
          </ul>
        ) : (
          <div className="text-center py-10 px-6">
            <Flame className="w-8 h-8 text-thrivv-text-muted mx-auto mb-3" />
            <p className="text-sm text-thrivv-text-secondary">
              No active streaks yet. They&apos;ll appear once members check in
              two days in a row.
            </p>
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes gym-row-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
