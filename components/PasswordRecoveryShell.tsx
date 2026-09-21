'use client';
import { useTranslation } from '@/lib/i18n/client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import BackgroundLayers from '@/components/BackgroundLayers';
import Logo from '@/components/Logo';

export default function PasswordRecoveryShell({ title, children }: { title: string; children: ReactNode }) {
  const { t, locale } = useTranslation();
  return (
    <div className="min-h-screen bg-thrivv-bg-darker text-thrivv-text-primary relative overflow-hidden">
      <BackgroundLayers />
      <main className="relative z-10 min-h-screen flex flex-col">
        <nav className="app-auth-nav px-6 lg:px-10 py-6 flex items-center justify-between gap-4">
          <Logo variant="gold" size="md" linkTo="/" />
          <Link href="/member/login" className="inline-flex items-center gap-1.5 text-sm text-thrivv-text-muted hover:text-thrivv-gold-500 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />{t("Back to sign in")}</Link>
        </nav>
        <div className="flex-1 flex items-center justify-center px-6 py-10 lg:py-16">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-semibold text-center mb-8">{title}</h1>
            <div className="glass-card p-6 sm:p-8">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
