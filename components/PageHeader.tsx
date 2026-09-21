'use client';
import { useTranslation } from '@/lib/i18n/client';

import type { ReactNode } from 'react';

/**
 * Premium page header used across authenticated app pages.
 * Mirrors the landing page section header pattern: small uppercase
 * eyebrow chip, balanced title with optional gradient gold accent,
 * subtitle text, and an optional end-side action slot.
 *
 * Pass either `title` (string) or `titleNode` (ReactNode for gradient parts).
 * Wraps content in `animate-fade-in-up` for a subtle entrance.
 */
export default function PageHeader({
  eyebrow,
  title,
  titleNode,
  subtitle,
  action,
  align = 'left',
  className = '',
}: {
  eyebrow?: string;
  title?: string;
  titleNode?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  const { t } = useTranslation();
  const isCenter = align === 'center';
  return (
    <header
      className={`relative animate-fade-in-up ${
        isCenter ? 'text-center max-w-3xl mx-auto' : ''
      } ${className}`}
    >
      <div
        className={`flex flex-col ${
          isCenter ? 'items-center' : 'sm:flex-row sm:items-end sm:justify-between'
        } gap-6`}
      >
        <div className="min-w-0">
          {eyebrow ? (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-thrivv-gold-500/20 bg-thrivv-gold-500/5 text-thrivv-gold-500 text-[10px] uppercase tracking-[0.28em] mb-5`}
            >
              {t(eyebrow)}
            </span>
          ) : null}
          <h1 className="text-balance text-4xl sm:text-5xl lg:text-[3.25rem] xl:text-[3.5rem] font-semibold tracking-tighter leading-[1.02]">
            {titleNode ?? (title ? t(title) : title)}
          </h1>
          {subtitle ? (
            <p className="mt-4 text-thrivv-text-secondary text-base sm:text-lg leading-relaxed max-w-2xl">
              {typeof subtitle === 'string' ? t(subtitle) : subtitle}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}

/**
 * Convenience helper: wrap part of a title string in a gold gradient span.
 * <PageHeader titleNode={<>Welcome back, {gradient('Bashar')}</>} />
 */
export function gradient(text: string) {
  return (
    <span className="bg-gradient-to-r from-thrivv-gold-500 via-thrivv-gold-300 to-thrivv-gold-500 bg-clip-text text-transparent">
      {text}
    </span>
  );
}
