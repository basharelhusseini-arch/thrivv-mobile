'use client';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LOCALE_COOKIE, localeOf, translator, type Locale } from './core';
const LanguageContext = createContext({ locale: 'en' as Locale, setLocale: (_locale: Locale) => {} });
export function LanguageProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const [locale, setLanguage] = useState(initialLocale);
  const router = useRouter();
  useEffect(() => { setLanguage(initialLocale); }, [initialLocale]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale: (next: Locale) => {
    const safe = localeOf(next);
    document.cookie = `${LOCALE_COOKIE}=${safe}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    setLanguage(safe);
    // Refresh translated server components without discarding form drafts.
    router.refresh();
  } }), [locale, router]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useTranslation() {
  const { locale, setLocale } = useContext(LanguageContext);
  const t = useMemo(() => translator(locale), [locale]);
  return { locale, setLocale, t, formatNumber: (value: number) => new Intl.NumberFormat(locale).format(value),
    formatDate: (value: Date, options?: Intl.DateTimeFormatOptions) => value.toLocaleDateString(locale, options) };
}
export function LanguageSwitch() {
  const { locale, setLocale } = useTranslation();
  return <div className="language-switch" role="group" aria-label={locale === 'ar' ? 'لغة التطبيق' : 'App language'}>
    <button type="button" lang="en" dir="ltr" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>English</button>
    <button type="button" lang="ar" dir="rtl" aria-pressed={locale === 'ar'} onClick={() => setLocale('ar')}>العربية</button>
  </div>;
}
