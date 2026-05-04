'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animates a numeric value from 0 → `value` using ease-out-expo.
 * Tasteful, ~1.2s. Respects prefers-reduced-motion.
 */
export default function AnimatedNumber({
  value,
  durationMs = 1200,
  decimals = 0,
  className,
  format,
}: {
  value: number;
  durationMs?: number;
  decimals?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(value);
  const startTs = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const fromRef = useRef(0);
  const toRef = useRef(value);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setDisplay(value);
      return;
    }
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (prefersReduced || !Number.isFinite(value)) {
      setDisplay(value);
      return;
    }

    fromRef.current = display;
    toRef.current = value;
    startTs.current = null;

    const easeOutExpo = (t: number) =>
      t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

    const tick = (ts: number) => {
      if (startTs.current === null) startTs.current = ts;
      const t = Math.min(1, (ts - startTs.current) / durationMs);
      const eased = easeOutExpo(t);
      const next = fromRef.current + (toRef.current - fromRef.current) * eased;
      setDisplay(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  const text = format
    ? format(display)
    : decimals === 0
    ? Math.round(display).toLocaleString()
    : display.toFixed(decimals);

  return <span className={className}>{text}</span>;
}
