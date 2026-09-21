import { cookies } from 'next/headers';
import { LOCALE_COOKIE, localeOf, translator } from './core';
export async function getTranslation() {
  const locale = localeOf((await cookies()).get(LOCALE_COOKIE)?.value);
  return { locale, t: translator(locale) };
}
