import type { Locale } from './locales'

const INTL_LOCALE: Record<Locale, string> = { es: 'es-BO', en: 'en-US' }

export function formatEventDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}
