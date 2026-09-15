'use client';

import { TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Point = { date: string; count: number };

const W = 600;
const H = 220;
const PAD_X = 36;
const PAD_Y = 24;

function shortDate(d: string): string {
  return new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default function EngagementChart({ data }: { data: Point[] }) {
  const totalCheckins = data.reduce((s, p) => s + p.count, 0);
  const max = Math.max(1, ...data.map((p) => p.count));

  const path = useMemo(() => {
    if (data.length === 0) return { line: '', area: '' };
    const innerW = W - PAD_X * 2;
    const innerH = H - PAD_Y * 2;
    const step = innerW / Math.max(1, data.length - 1);
    const points = data.map((p, i) => {
      const x = PAD_X + i * step;
      const y = PAD_Y + innerH - (p.count / max) * innerH;
      return { x, y };
    });
    const line = points
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(' ');
    const area =
      `M ${points[0].x.toFixed(1)} ${(H - PAD_Y).toFixed(1)} ` +
      points
        .map((pt) => `L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
        .join(' ') +
      ` L ${points[points.length - 1].x.toFixed(1)} ${(H - PAD_Y).toFixed(1)} Z`;
    return { line, area, points };
  }, [data, max]);

  const svgRef = useRef<SVGSVGElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [lineLen, setLineLen] = useState(0);

  useEffect(() => {
    if (lineRef.current) {
      const len = lineRef.current.getTotalLength();
      setLineLen(len);
    }
  }, [path.line]);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (data.length === 0) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xRatio = (e.clientX - rect.left) / rect.width;
    const innerW = W - PAD_X * 2;
    const x = xRatio * W - PAD_X;
    const step = innerW / Math.max(1, data.length - 1);
    const i = Math.round(x / step);
    if (i >= 0 && i < data.length) setHoverIdx(i);
  };

  const empty = totalCheckins === 0;
  const points = (path as any).points as { x: number; y: number }[] | undefined;

  return (
    <div className="premium-card h-full">
      <div className="flex items-center justify-between px-6 py-5">
        <h2 className="flex items-center text-lg font-semibold text-thrivv-text-primary">
          <TrendingUp className="w-5 h-5 mr-2.5 text-thrivv-gold-500" />
          Daily Check-ins
        </h2>
        <span className="text-xs text-thrivv-text-muted uppercase tracking-widest">
          Last 30 days · {totalCheckins} total
        </span>
      </div>
      <div className="divider" />
      <div className="p-6">
        {empty ? (
          <div className="text-center py-14">
            <TrendingUp className="w-8 h-8 text-thrivv-text-muted mx-auto mb-3" />
            <p className="text-sm text-thrivv-text-secondary">
              No check-ins in the last 30 days yet.
            </p>
          </div>
        ) : (
          <div className="relative">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="w-full h-[220px]"
              onMouseMove={onMove}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <defs>
                <linearGradient id="goldFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#d8bd7d" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#d8bd7d" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[0.25, 0.5, 0.75].map((t) => (
                <line
                  key={t}
                  x1={PAD_X}
                  x2={W - PAD_X}
                  y1={PAD_Y + (H - PAD_Y * 2) * t}
                  y2={PAD_Y + (H - PAD_Y * 2) * t}
                  stroke="#d8bd7d"
                  strokeOpacity="0.06"
                  strokeDasharray="2 4"
                />
              ))}

              <path
                d={path.area}
                fill="url(#goldFill)"
                style={{
                  animation:
                    'gym-area-rise 1400ms cubic-bezier(0.16, 1, 0.3, 1) both',
                  animationDelay: '300ms',
                  transformOrigin: 'bottom',
                }}
              />
              <path
                ref={lineRef}
                d={path.line}
                fill="none"
                stroke="#d8bd7d"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{
                  strokeDasharray: lineLen || 1,
                  strokeDashoffset: lineLen,
                  animation: lineLen
                    ? 'gym-line-draw 1500ms cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    : undefined,
                }}
              />

              {points?.map((pt, i) => (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoverIdx === i ? 4 : 2}
                  fill="#d8bd7d"
                  className="transition-all duration-150"
                  style={{
                    opacity: 0,
                    animation: 'gym-fade-in 280ms ease-out forwards',
                    animationDelay: `${1500 + (i / Math.max(1, data.length)) * 200}ms`,
                  }}
                />
              ))}

              {hoverIdx !== null && points && (
                <line
                  x1={points[hoverIdx].x}
                  x2={points[hoverIdx].x}
                  y1={PAD_Y}
                  y2={H - PAD_Y}
                  stroke="#d8bd7d"
                  strokeOpacity="0.4"
                  strokeDasharray="2 3"
                />
              )}
            </svg>

            {hoverIdx !== null && data[hoverIdx] && (
              <div className="absolute top-2 right-2 px-3 py-2 rounded-lg bg-thrivv-bg-card/90 backdrop-blur border border-thrivv-gold-500/20 shadow-lg text-xs">
                <div className="text-thrivv-text-muted">
                  {shortDate(data[hoverIdx].date)}
                </div>
                <div className="text-thrivv-gold-500 font-semibold tabular-nums">
                  {data[hoverIdx].count} check-in
                  {data[hoverIdx].count === 1 ? '' : 's'}
                </div>
              </div>
            )}

            <div className="flex justify-between text-[10px] text-thrivv-text-muted mt-3 px-2 tracking-wider">
              <span>{shortDate(data[0].date)}</span>
              <span>{shortDate(data[Math.floor(data.length / 2)].date)}</span>
              <span>{shortDate(data[data.length - 1].date)}</span>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes gym-line-draw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes gym-area-rise {
          from {
            opacity: 0;
            transform: scaleY(0.4);
          }
          to {
            opacity: 1;
            transform: scaleY(1);
          }
        }
        @keyframes gym-fade-in {
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
