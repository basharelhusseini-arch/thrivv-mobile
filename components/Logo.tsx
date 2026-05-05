'use client';

import Link from 'next/link';
import { useId } from 'react';

interface LogoProps {
  variant?: 'gold' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  linkTo?: string;
}

// Size presets matching requirements
const sizeClasses = {
  sm: 'h-5', //  20px - mobile navbar
  md: 'h-6', //  24px - desktop navbar, sidebar
  lg: 'h-8', //  32px - larger contexts
  xl: 'h-12', // 48px - section headers
  hero: 'h-16 sm:h-20 lg:h-24', // 64-96px responsive - hero sections
};

/**
 * Premium THRIV/// wordmark.
 *
 * Custom geometric path-based wordmark with skew-x(-10°) forward lean for
 * athletic, performance-oriented character. Refined for a more deliberate
 * tech-brand feel:
 *
 *   - Subtle vertical gradient fill (anodized-gold finish on the gold variant)
 *   - Crisp two-pass drop shadow rather than a soft outer glow
 *   - Slimmer, more deliberate trailing slashes
 *   - Unique per-instance gradient id so multiple logos can coexist
 *
 * Public API (props, size presets, variants, linkTo) is unchanged so every
 * existing call site keeps working without edits.
 */
export default function Logo({
  variant = 'gold',
  size = 'md',
  className = '',
  linkTo,
}: LogoProps) {
  // Stable, unique id per render (sidebar + nav + footer can all coexist).
  const reactId = useId();
  const gradientId = `thrivv-grad-${reactId.replace(/:/g, '')}`;

  const isGold = variant === 'gold';

  // Subtle vertical gradient gives a refined "polished" finish without
  // feeling dated. Stops sit close enough in value that the wordmark still
  // reads as a single confident colour at small sizes.
  const gradientStops = isGold
    ? ['#FFE066', '#FFD000', '#FFC400']
    : ['#FFFFFF', '#FFFFFF', '#F2F2F2'];

  // Tighter, more deliberate drop shadow than a soft outer glow.
  // Tiny dark depth shadow + a small gold halo for the gold variant only.
  const filterStyle = isGold
    ? {
        filter:
          'drop-shadow(0 1px 0 rgba(0,0,0,0.35)) drop-shadow(0 0 8px rgba(255,208,0,0.18))',
      }
    : undefined;

  const logoSvg = (
    <svg
      viewBox="0 0 408 100"
      className={`${sizeClasses[size]} ${className} w-auto`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={filterStyle}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={gradientStops[0]} />
          <stop offset="50%" stopColor={gradientStops[1]} />
          <stop offset="100%" stopColor={gradientStops[2]} />
        </linearGradient>
      </defs>

      <g transform="skewX(-10)" fill={`url(#${gradientId})`}>
        {/* T */}
        <path d="M 8 18 L 65 18 L 65 30 L 48 30 L 48 82 L 32 82 L 32 30 L 15 30 Z" />

        {/* H */}
        <path d="M 72 18 L 88 18 L 88 44 L 110 44 L 110 18 L 126 18 L 126 82 L 110 82 L 110 58 L 88 58 L 88 82 L 72 82 Z" />

        {/* R — bowl */}
        <path d="M 133 18 L 175 18 C 184 18 190 20 195 24 C 199 28 201 33 201 41 C 201 48 199 53 195 57 C 190 61 184 63 175 63 L 149 63 L 149 82 L 133 82 Z M 149 31 L 149 51 L 172 51 C 177 51 180 50 182 48 C 184 46 185 43 185 40 C 185 36 184 33 182 31 C 180 29 177 28 172 28 L 149 28 Z" />
        {/* R — tail */}
        <path d="M 168 63 L 182 63 L 196 82 L 178 82 Z" />

        {/* I */}
        <path d="M 203 18 L 219 18 L 219 82 L 203 82 Z" />

        {/* V */}
        <path d="M 226 18 L 243 18 L 263 66 L 283 18 L 300 18 L 270 82 L 256 82 Z" />

        {/* /// — slimmer, more deliberate. Each slash 8u wide, gap 6u. */}
        <path d="M 308 82 L 316 82 L 332 18 L 324 18 Z" />
        <path d="M 338 82 L 346 82 L 362 18 L 354 18 Z" />
        <path d="M 368 82 L 376 82 L 392 18 L 384 18 Z" />
      </g>
    </svg>
  );

  if (linkTo) {
    return (
      <Link
        href={linkTo}
        aria-label="Thrivv home"
        className="inline-block transition-opacity duration-300 hover:opacity-85"
      >
        {logoSvg}
      </Link>
    );
  }

  return (
    <div className="inline-block" aria-label="Thrivv">
      {logoSvg}
    </div>
  );
}
