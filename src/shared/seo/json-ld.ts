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
  /** El precio en dólares del admin, si lo tiene: Google lo enseña a quien busca desde EE. UU. o Canadá. */
  readonly priceUsdCents?: number | null
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
  offers: Oferta | Oferta[]
}

type Oferta = { '@type': 'Offer'; price: string; priceCurrency: string; availability: string; url: string }

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
  logo: string
  slogan: string
  areaServed: string[]
  knowsLanguage: string[]
  telephone?: string
  email?: string
  sameAs?: string[]
}

export type WebSiteJsonLd = { '@context': 'https://schema.org'; '@type': 'WebSite'; name: string; url: string; inLanguage: string; publisher: { '@type': 'Organization'; name: string } }

/** Dónde atiende la marca (9 oct): toda América, sin decir desde dónde trabaja. */
export const ZONA_DE_SERVICIO = ['Latin America', 'United States', 'Canada'] as const

/** Lo que Google cruza con los directorios y las redes: nombre, dirección, teléfono y web. */
export type NegocioParaGoogle = {
  readonly whatsapp: string
  readonly direccion: string
  readonly ciudad: string
  readonly pais: string
  readonly redes: readonly string[]
  readonly correo?: string
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
    offers: ((): Oferta | Oferta[] => {
      const oferta = (cents: number, moneda: string): Oferta => ({
        '@type': 'Offer',
        price: toPriceUnits(cents),
        priceCurrency: moneda,
        availability: 'https://schema.org/InStock',
        url: `${baseUrl}/${locale}#precios`,
      })
      const enBs = oferta(plan.price.cents, plan.price.currency)
      return plan.priceUsdCents == null ? enBs : [enBs, oferta(plan.priceUsdCents, 'USD')]
    })(),
  }))
}

/** El sitio en el idioma de la página: con el `hreflang`, Google sabe qué versión enseñar en cada país. */
export function websiteJsonLd(locale: Locale, baseUrl: string = env.SITE_URL): WebSiteJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND.siteName,
    url: `${baseUrl.replace(/\/$/, '')}/${locale}`,
    inLanguage: locale,
    publisher: { '@type': 'Organization', name: BRAND.siteName },
  }
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

/**
 * El negocio, marcado como `Organization` (9 oct: era `LocalBusiness`, que pide dirección; la marca vende en
 * línea a toda América y no dice desde dónde trabaja). Nombre, dirección, teléfono y web tienen que ser
 * **los mismos** que en el pie y en las redes: es lo que Google compara para confiar en la
 * ficha. Por eso salen de «La web», la misma fuente que el pie. Lo vacío no se publica.
 */
export function organizationJsonLd(negocio: NegocioParaGoogle, baseUrl: string = env.SITE_URL): OrganizationJsonLd {
  const redes = negocio.redes.filter((r) => r !== '')
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND.siteName,
    url: baseUrl,
    logo: `${baseUrl.replace(/\/$/, '')}/icon.png`,
    areaServed: [...ZONA_DE_SERVICIO],
    knowsLanguage: ['es', 'en'],
    // Sin dirección ni zona (9 oct, decisión del usuario): la marca vende a toda América y no dice desde
    // dónde trabaja, tampoco a Google.
    slogan: BRAND.tagline,
    ...(negocio.whatsapp === '' ? {} : { telephone: negocio.whatsapp }),
    ...(negocio.correo ? { email: negocio.correo } : {}),
    ...(redes.length === 0 ? {} : { sameAs: redes }),
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
