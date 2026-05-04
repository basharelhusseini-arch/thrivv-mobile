'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Cinematic scroll reveal. Wraps children in an IntersectionObserver and
 * fades / lifts them into view the first time they cross the viewport.
 *
 * - Pure presentation. No data, no side effects beyond observing the ref.
 * - Honors prefers-reduced-motion (renders shown immediately).
 * - Designed for landing surfaces; do not use inside data-heavy app routes
 *   without thinking about layout shift.
 *
 * Usage:
 *   <Reveal delay={120}>
 *     <h1>...</h1>
 *   </Reveal>
 */
export default function Reveal({
  children,
  delay = 0,
  threshold = 0.15,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  threshold?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
