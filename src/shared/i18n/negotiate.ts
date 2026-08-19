import { DEFAULT_LOCALE, isLocale, type Locale } from './locales'

type NegotiationInput = { cookie?: string | null; acceptLanguage?: string | null }

type Preference = { tag: string; quality: number }

function parseAcceptLanguage(header: string): Preference[] {
  return header
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';')
      const qParam = params.find((p) => p.trim().startsWith('q='))
      const quality = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1
      return { tag: tag.trim().toLowerCase(), quality: Number.isNaN(quality) ? 0 : quality }
    })
    .filter((p) => p.tag.length > 0)
    .sort((a, b) => b.quality - a.quality)
}

export function negotiateLocale({ cookie, acceptLanguage }: NegotiationInput): Locale {
  if (cookie && isLocale(cookie)) return cookie
  if (!acceptLanguage) return DEFAULT_LOCALE

  for (const { tag } of parseAcceptLanguage(acceptLanguage)) {
    const base = tag.split('-')[0] ?? ''
    if (isLocale(base)) return base
  }
  return DEFAULT_LOCALE
}
