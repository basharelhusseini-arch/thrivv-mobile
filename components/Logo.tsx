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
 * Custom path-based wordmark redrawn for athletic-tech proportions:
 *
 *   - 12u stroke weight on a 64u cap height (~18.75% — sits in the
 *     refined-sans range used by WHOOP / Strava / On).
 *   - Tight, deliberate kerning (4u advance between letters).
 *   - Sharp 90° terminals throughout. R bowl is rendered as a clean
 *     rectangular "P" with an even-odd hollow + a parallelogram tail.
 *   - Three slim 6u trailing slashes at uniform 12u rhythm.
 *   - skewX(-10°) preserved for forward-leaning performance character.
 *   - Subtle vertical gradient fill for a polished anodized finish at
 *     hero scale; reads as one confident gold at navbar size.
 *   - Crisp two-pass drop shadow rather than a soft outer glow.
 *
 * Public component API (props, sizes, variants, linkTo) is unchanged so
 * every existing call site continues to work without edits.
 */
export default function Logo({
  variant = 'gold',
  size = 'md',
  className = '',
  linkTo,
}: LogoProps) {
  // Stable, unique gradient id per render so multiple Logo instances on
  // the same page (sidebar + navbar + footer) cannot collide.
  const reactId = useId();
  const gradientId = `thrivv-grad-${reactId.replace(/:/g, '')}`;

  const isGold = variant === 'gold';

  // Subtle vertical gradient. Stops sit close enough in value that the
  // wordmark still reads as a single confident colour at small sizes.
  const gradientStops = isGold
    ? ['#FFE066', '#FFD000', '#FFC400']
    : ['#FFFFFF', '#FFFFFF', '#F2F2F2'];

  // Tight, deliberate drop shadow rather than a soft outer glow.
  const filterStyle = isGold
    ? {
        filter:
          'drop-shadow(0 1px 0 rgba(0,0,0,0.35)) drop-shadow(0 0 8px rgba(255,208,0,0.18))',
      }
    : undefined;

  const logoSvg = (
    <svg
      viewBox="0 0 300 100"
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
        {/* T — cap 48u wide, 12u stroke */}
        <path d="M 0 18 L 48 18 L 48 30 L 30 30 L 30 82 L 18 82 L 18 30 L 0 30 Z" />

        {/* H — two stems + 12u crossbar */}
        <path d="M 52 18 L 64 18 L 64 44 L 81 44 L 81 18 L 93 18 L 93 82 L 81 82 L 81 56 L 64 56 L 64 82 L 52 82 Z" />

        {/* R — square bowl with even-odd hollow */}
        <path
          fillRule="evenodd"
          d="M 97 18 L 138 18 L 138 54 L 109 54 L 109 82 L 97 82 Z M 109 30 L 109 42 L 126 42 L 126 30 Z"
        />
        {/* R — diagonal tail */}
        <path d="M 126 54 L 138 54 L 172 82 L 160 82 Z" />

        {/* I — single bar */}
        <path d="M 176 18 L 188 18 L 188 82 L 176 82 Z" />

        {/* V — sharp valley + sharp point */}
        <path d="M 192 18 L 204 18 L 217 60 L 230 18 L 242 18 L 217 82 Z" />

        {/* /// — three deliberate 6u-wide speed slashes at uniform rhythm */}
        <path d="M 248 82 L 254 82 L 269 18 L 263 18 Z" />
        <path d="M 260 82 L 266 82 L 281 18 L 275 18 Z" />
        <path d="M 272 82 L 278 82 L 293 18 L 287 18 Z" />
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
