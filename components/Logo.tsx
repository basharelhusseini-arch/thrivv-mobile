'use client';

import Link from 'next/link';
import { THRIVV_WORDMARK } from '@/lib/brand-wordmark';

interface LogoProps {
  variant?: 'gold' | 'white';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  className?: string;
  linkTo?: string;
}

const sizeClasses = {
  sm: 'h-5',
  md: 'h-6',
  lg: 'h-8',
  xl: 'h-12',
  hero: 'h-16 sm:h-20 lg:h-24',
};

/** Original outlined lettering: six readable letters, one quiet solid finish. */
export default function Logo({ variant = 'gold', size = 'md', className = '', linkTo }: LogoProps) {
  const mark = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={THRIVV_WORDMARK.viewBox}
      width={THRIVV_WORDMARK.width}
      height={THRIVV_WORDMARK.height}
      className={`block w-auto shrink-0 ${sizeClasses[size]} ${className}`}
      fill={THRIVV_WORDMARK.colors[variant]}
      role={linkTo ? undefined : 'img'}
      aria-label={linkTo ? undefined : 'Thrivv'}
      aria-hidden={linkTo ? true : undefined}
      focusable="false"
    >
      <path d={THRIVV_WORDMARK.path} fillRule="evenodd" />
    </svg>
  );

  return linkTo ? (
    <Link
      href={linkTo}
      aria-label="Thrivv home"
      className="inline-flex shrink-0 align-middle rounded-sm transition-opacity duration-200 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-thrivv-gold-400"
    >
      {mark}
    </Link>
  ) : <span className="inline-flex shrink-0 align-middle">{mark}</span>;
}
