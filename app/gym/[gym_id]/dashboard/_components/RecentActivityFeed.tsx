'use client';

import { Activity } from 'lucide-react';

type Row = {
  id: string;
  user_id: string;
  name: string;
  date: string;
  created_at: string;
};

function relativeTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const m = Math.round(ms / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function describe(_row: Row): { icon: React.ReactNode; text: string } {
  return { icon: <Activity className="w-4 h-4" />, text: 'Submitted a daily check-in' };
}

export default function RecentActivityFeed({ rows }: { rows: Row[] }) {
  return (
    <div className="premium-card">
      <div className="flex items-center justify-between px-6 py-5">
        <h2 className="flex items-center text-lg font-semibold text-thrivv-text-primary">
          <Activity className="w-5 h-5 mr-2.5 text-thrivv-gold-500" />
          Recent Activity
        </h2>
        <span className="text-xs text-thrivv-text-muted uppercase tracking-widest">
          Last 20
        </span>
      </div>
      <div className="divider" />
      {rows.length === 0 ? (
        <div className="p-10 text-center">
          <Activity className="w-8 h-8 text-thrivv-text-muted mx-auto mb-3" />
          <p className="text-sm text-thrivv-text-secondary">
            No recent check-ins from this gym&apos;s members yet.
          </p>
        </div>
      ) : (
        <ol className="relative p-6">
          <span
            className="absolute left-[34px] top-6 bottom-6 w-px bg-thrivv-gold-500/10"
            aria-hidden
          />
          {rows.map((row, i) => {
            const { icon, text } = describe(row);
            return (
              <li
                key={row.id}
                className="relative flex items-start gap-4 py-3 group"
                style={{
                  opacity: 0,
                  animation:
                    'gym-feed-in 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  animationDelay: `${300 + i * 45}ms`,
                }}
              >
                <span className="relative z-10 flex items-center justify-center w-9 h-9 rounded-lg bg-thrivv-bg-card border border-thrivv-gold-500/15 group-hover:border-thrivv-gold-500/40 transition-colors">
                  {icon}
                </span>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm text-thrivv-text-primary truncate">
                      <span className="font-medium">{row.name}</span>{' '}
                      <span className="text-thrivv-text-secondary">{text}</span>
                    </p>
                    <span className="text-xs text-thrivv-text-muted shrink-0">
                      {relativeTime(row.created_at)}
                    </span>
                  </div>
                  <p className="text-[11px] text-thrivv-text-muted truncate">
                    {row.date}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <style jsx>{`
        @keyframes gym-feed-in {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
