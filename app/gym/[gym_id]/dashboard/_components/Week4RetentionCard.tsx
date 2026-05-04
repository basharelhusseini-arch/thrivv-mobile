'use client';

import { Info, Sparkles, Users } from 'lucide-react';
import { useState } from 'react';
import AnimatedNumber from './AnimatedNumber';
import type { GymAnalytics } from './GymDashboardView';

export default function Week4RetentionCard({ data }: { data: GymAnalytics }) {
  const r = data.week4_retention;
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="group premium-card relative overflow-hidden h-full transition-all duration-500">
      {/* Conic gradient ring that fades in on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        aria-hidden
        style={{
          background:
            'conic-gradient(from 220deg at 30% 20%, rgba(255,208,0,0.25), transparent 35%, transparent 70%, rgba(255,208,0,0.18))',
          maskImage:
            'linear-gradient(black, black) content-box, linear-gradient(black, black)',
          WebkitMaskImage:
            'linear-gradient(black, black) content-box, linear-gradient(black, black)',
          padding: '1px',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      <div className="absolute -top-32 -left-16 w-72 h-72 bg-thrivv-gold-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative p-8 lg:p-10 h-full flex flex-col">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-thrivv-text-muted text-xs uppercase tracking-widest mb-2">
              <Sparkles className="w-3.5 h-3.5 text-thrivv-gold-500" />
              Headline Metric
            </div>
            <h2 className="text-xl font-semibold text-thrivv-text-primary">
              Week 4 Retention
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            aria-label="What does this mean?"
            className="p-2 rounded-lg hover:bg-thrivv-gold-500/10 text-thrivv-text-muted hover:text-thrivv-gold-500 transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {showInfo && (
          <div className="mb-6 p-4 rounded-xl bg-thrivv-bg-card/60 border border-thrivv-gold-500/10 text-xs text-thrivv-text-secondary leading-relaxed animate-fade-in">
            <span className="text-thrivv-text-primary font-medium">Definition.</span>{' '}
            Of all members whose membership has reached at least day 22, the
            percentage who logged any check-in during their personal week 4
            (days 22–28). A high number means your pilot is sticky.
          </div>
        )}

        {r ? (
          <div className="flex-1 flex flex-col lg:flex-row items-start lg:items-end gap-8">
            <div className="flex-1">
              <div className="flex items-baseline gap-3 mb-3">
                <AnimatedNumber
                  value={r.rate_pct}
                  className={percentClass(r.rate_pct)}
                />
                <div className="text-3xl text-thrivv-text-muted font-light">%</div>
              </div>
              <div className="flex items-center gap-2 text-sm text-thrivv-text-secondary">
                <Users className="w-4 h-4 text-thrivv-text-muted" />
                <span>
                  <AnimatedNumber
                    value={r.retained}
                    className="text-thrivv-text-primary font-medium"
                  />{' '}
                  of {r.eligible} eligible members retained
                </span>
              </div>
            </div>

            <RetentionDots rate={r.rate_pct} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
            <div className="icon-badge mb-4">
              <Sparkles className="w-5 h-5 text-thrivv-gold-500" />
            </div>
            <p className="text-thrivv-text-primary font-medium mb-1">
              Not enough data yet
            </p>
            <p className="text-sm text-thrivv-text-secondary max-w-xs">
              Week 4 retention will appear here once your earliest members
              reach day 22 of their membership.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function percentClass(rate: number): string {
  const base = 'text-7xl lg:text-8xl font-semibold tabular-nums leading-none';
  if (rate >= 80) return `${base} text-thrivv-neon-green`;
  if (rate >= 60) return `${base} text-thrivv-gold-500`;
  if (rate >= 30) return `${base} text-thrivv-gold-300`;
  return `${base} text-thrivv-text-secondary`;
}

function RetentionDots({ rate }: { rate: number }) {
  const filled = Math.round((rate / 100) * 10);
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] uppercase tracking-widest text-thrivv-text-muted">
        Cohort heat
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={`w-2.5 h-8 rounded-full ${
              i < filled
                ? 'bg-thrivv-gold-500 shadow-[0_0_12px_rgba(255,208,0,0.45)]'
                : 'bg-thrivv-bg-card'
            }`}
            style={{
              animation: 'gym-dot-rise 700ms cubic-bezier(0.16, 1, 0.3, 1) both',
              animationDelay: `${600 + i * 70}ms`,
            }}
          />
        ))}
      </div>
      <style jsx>{`
        @keyframes gym-dot-rise {
          from {
            opacity: 0;
            transform: translateY(10px) scaleY(0.3);
          }
          to {
            opacity: 1;
            transform: translateY(0) scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}
