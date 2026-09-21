import ar from './ar.json';
export type Locale = 'en' | 'ar';
export const LOCALE_COOKIE = 'thrivv-language';
export const localeOf = (value: unknown): Locale => value === 'ar' ? 'ar' : 'en';
export type TranslationValues = Record<string, string | number>;
export function translate(locale: Locale, source: string, values: TranslationValues = {}): string {
  const messages: Record<string, string> = ar;
  const result = locale === 'ar' ? (Object.prototype.hasOwnProperty.call(messages, source) ? messages[source] : source) : source;
  const entities: Record<string, string> = { '&apos;': "'", '&#39;': "'", '&quot;': '"', '&amp;': '&', '&lt;': '<', '&gt;': '>' };
  return result.replace(/&(?:apos|quot|amp|lt|gt|#39);/g, entity => entities[entity]).replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = Object.prototype.hasOwnProperty.call(values, key) ? values[key] : undefined;
    return value === undefined ? match : String(value);
  });
}
export const translator = (locale: Locale) => (source: string, values?: TranslationValues) => translate(locale, source, values);
