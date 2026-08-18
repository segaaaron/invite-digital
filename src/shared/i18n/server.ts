import { isLocale, type Locale } from './locales'

export function parseLocaleParam(value: string): Locale | null {
  return isLocale(value) ? value : null
}
