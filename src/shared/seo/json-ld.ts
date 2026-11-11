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
  image: string[]
  sku: string
  brand: { '@type': 'Brand'; name: string }
  offers: Oferta | Oferta[]
}

type Oferta = {
  '@type': 'Offer'
  price: string
  priceCurrency: string
  availability: string
  url: string
  priceValidUntil: string
  itemCondition: string
  shippingDetails: unknown
  hasMerchantReturnPolicy: unknown
}

export type FaqJsonLd = {
  '@context': 'https://schema.org'
  '@type': 'FAQPage'
  mainEntity: { '@type': 'Question'; name: string; acceptedAnswer: { '@type': 'Answer'; text: string } }[]
}

export type OrganizationJsonLd = {
  '@context': 'https://schema.org'
  '@type': 'Organization'
  '@id': string
  name: string
  alternateName: string[]
  url: string
  logo: string
  slogan: string
  areaServed: string[]
  knowsLanguage: string[]
  telephone?: string
  email?: string
  sameAs?: string[]
}

export type WebSiteJsonLd = { '@context': 'https://schema.org'; '@type': 'WebSite'; name: string; alternateName: string[]; url: string; inLanguage: string; publisher: { '@id': string } }

/** Dónde atiende la marca: Bolivia primero (11 nov, mercado principal) y toda América; sin decir desde dónde trabaja (9 oct). */
export const ZONA_DE_SERVICIO = ['Bolivia', 'Latin America', 'United States', 'Canada'] as const

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

/** La invitación de muestra (arte real) que Google enseña con el plan: su ficha de comercio exige `image`. */
const IMAGEN_DEL_PLAN = '/site/portada/inv-1.webp'

/**
 * Producto digital: no hay envío físico. Lo que se declara es lo que la web ya dice: entrega en línea,
 * gratis, lista en 3 a 5 días según el plan, y la reserva **no es reembolsable** (preguntas frecuentes).
 */
function condicionesDeVenta(moneda: string) {
  return {
    shippingDetails: {
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: moneda },
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'BO' },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
        transitTime: { '@type': 'QuantitativeValue', minValue: 3, maxValue: 5, unitCode: 'DAY' },
      },
    },
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'BO',
      returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
    },
  }
}

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
    image: [`${baseUrl.replace(/\/$/, '')}${IMAGEN_DEL_PLAN}`],
    sku: plan.slug,
    brand: { '@type': 'Brand', name: BRAND.siteName },
    // Solo bolivianos (7 nov): la web ya no enseña ni marca importes en dólares.
    offers: {
      '@type': 'Offer',
      price: toPriceUnits(plan.price.cents),
      priceCurrency: plan.price.currency,
      availability: 'https://schema.org/InStock',
      url: `${baseUrl}/${locale}#planes`,
      // Hasta fin del año que viene: el precio lo cambia el admin, y una fecha pasada invalida la ficha.
      priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
      itemCondition: 'https://schema.org/NewCondition',
      ...condicionesDeVenta(plan.price.currency),
    },
  }))
}

/** El identificador de la marca: el mismo en `Organization` y `WebSite`, para que Google vea una sola entidad. */
const idDeLaMarca = (baseUrl: string): string => `${baseUrl.replace(/\/$/, '')}/#organization`

/** Cómo la gente escribe la marca al buscarla: con espacio y como dominio. */
const nombresAlternos = (baseUrl: string): string[] => [new URL(baseUrl).hostname.replace(/^www\./, ''), BRAND.siteName.replace(/\s+/g, '')]

/** El sitio en el idioma de la página: con el `hreflang`, Google sabe qué versión enseñar en cada país. */
export function websiteJsonLd(locale: Locale, baseUrl: string = env.SITE_URL): WebSiteJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND.siteName,
    alternateName: nombresAlternos(baseUrl),
    url: `${baseUrl.replace(/\/$/, '')}/${locale}`,
    inLanguage: locale,
    // Misma entidad que la `Organization` de la portada: Google las une por `@id`.
    publisher: { '@id': idDeLaMarca(baseUrl) },
  }
}

/**
 * Las preguntas, para Google. **Tienen que ser las que la página enseña**: marcar unas y pintar
 * otras es exactamente lo que Google llama marcado engañoso. Por eso acepta una lista propia —la
 * portada tiene las suyas— y solo cae en las del diccionario cuando no se le pasa ninguna.
 */
export function faqJsonLd(dictionary: FaqSource, preguntas?: readonly { readonly question: string; readonly answer: string }[]): FaqJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (preguntas ?? dictionary.faq.items).map((item) => ({
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
    '@id': idDeLaMarca(baseUrl),
    name: BRAND.siteName,
    alternateName: nombresAlternos(baseUrl),
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
