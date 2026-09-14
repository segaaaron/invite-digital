import { BRAND } from '@/shared/config/brand'
import { env } from '@/shared/config/env'
import type { Locale } from '@/shared/i18n/locales'

/**
 * Structural shapes, not the catalog's own types: `shared` may only import from
 * `shared`, so these helpers describe what they need instead of depending on a module.
 */
export type PricedPlan = {
  readonly slug: string
  readonly name: string
  readonly description: string
  readonly price: { readonly cents: number; readonly currency: string }
}

export type FaqSource = {
  readonly faq: { readonly items: readonly { readonly question: string; readonly answer: string }[] }
}

export type ProductJsonLd = {
  '@context': 'https://schema.org'
  '@type': 'Product'
  name: string
  description: string
  brand: { '@type': 'Brand'; name: string }
  offers: {
    '@type': 'Offer'
    price: string
    priceCurrency: string
    availability: string
    url: string
  }
}

export type FaqJsonLd = {
  '@context': 'https://schema.org'
  '@type': 'FAQPage'
  mainEntity: { '@type': 'Question'; name: string; acceptedAnswer: { '@type': 'Answer'; text: string } }[]
}

export type OrganizationJsonLd = {
  '@context': 'https://schema.org'
  '@type': 'Organization'
  name: string
  url: string
  areaServed: string
  slogan: string
}

export type BreadcrumbJsonLd = {
  '@context': 'https://schema.org'
  '@type': 'BreadcrumbList'
  itemListElement: { '@type': 'ListItem'; position: number; name: string; item: string }[]
}

const CENTS_PER_UNIT = 100

const toPriceUnits = (cents: number): string => (cents / CENTS_PER_UNIT).toFixed(2)

export function productJsonLd(
  plans: readonly PricedPlan[],
  locale: Locale,
  baseUrl: string = env.SITE_URL,
): ProductJsonLd[] {
  return plans.map((plan) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${BRAND.siteName} · ${plan.name}`,
    description: plan.description,
    brand: { '@type': 'Brand', name: BRAND.siteName },
    offers: {
      '@type': 'Offer',
      price: toPriceUnits(plan.price.cents),
      priceCurrency: plan.price.currency,
      availability: 'https://schema.org/InStock',
      url: `${baseUrl}/${locale}#precios`,
    },
  }))
}

export function faqJsonLd(dictionary: FaqSource): FaqJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: dictionary.faq.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

export function organizationJsonLd(baseUrl: string = env.SITE_URL): OrganizationJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND.siteName,
    url: baseUrl,
    areaServed: BRAND.city,
    slogan: BRAND.tagline,
  }
}

export function breadcrumbJsonLd(items: readonly { name: string; url: string }[]): BreadcrumbJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * Serializes a block for `dangerouslySetInnerHTML`. Escaping `<` keeps content that
 * happens to contain markup from closing the script tag early.
 */
export const jsonLdScript = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c')
