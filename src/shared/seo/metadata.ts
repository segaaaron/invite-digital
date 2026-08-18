import type { Metadata } from 'next'
import { BRAND } from '@/shared/config/brand'
import { env } from '@/shared/config/env'
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/shared/i18n/locales'

const OG_LOCALES: Record<Locale, string> = { es: 'es_BO', en: 'en_US' }

const trimTrailingSlash = (value: string): string => value.replace(/\/$/, '')

/** `/es/colecciones` -> `/colecciones`, so the same path can be rebuilt per language. */
const stripLocale = (path: string): string => {
  const [first, ...rest] = path.split('/').filter(Boolean)
  if (first !== undefined && (LOCALES as readonly string[]).includes(first)) {
    return rest.length > 0 ? `/${rest.join('/')}` : ''
  }
  return path === '/' ? '' : path
}

export type Alternates = { canonical: string; languages: Record<string, string> }

// `baseUrl` is a parameter rather than a read of `env.SITE_URL` inside the body so the
// tests can pin the production domain without depending on the runner's environment.
export function buildAlternates(path: string, baseUrl: string = env.SITE_URL): Alternates {
  const rest = trimTrailingSlash(stripLocale(path))
  const urlFor = (locale: Locale): string => `${baseUrl}/${locale}${rest}`
  const absolute = path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`

  return {
    canonical: trimTrailingSlash(absolute),
    languages: {
      es: urlFor('es'),
      en: urlFor('en'),
      'x-default': urlFor(DEFAULT_LOCALE),
    },
  }
}

export function buildPageMetadata({
  locale,
  path,
  title,
  description,
  baseUrl = env.SITE_URL,
}: {
  locale: Locale
  path: string
  title: string
  description: string
  baseUrl?: string
}): Metadata {
  const alternates = buildAlternates(path, baseUrl)

  return {
    title,
    description,
    alternates,
    metadataBase: new URL(baseUrl),
    openGraph: {
      type: 'website',
      siteName: BRAND.siteName,
      locale: OG_LOCALES[locale],
      title,
      description,
      url: alternates.canonical,
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: true, follow: true },
  }
}

/** Meta descriptions are cut around 155 characters by search engines. */
export function truncateDescription(text: string, max = 155): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}
