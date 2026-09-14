import { describe, expect, it } from 'vitest'
import { es } from '@/shared/i18n/messages/es'
import { breadcrumbJsonLd, faqJsonLd, jsonLdScript, organizationJsonLd, productJsonLd, type PricedPlan } from './json-ld'

const SITE = 'https://invitepremium.bo'

const plans: PricedPlan[] = [
  {
    slug: 'atelier',
    price: { cents: 69000, currency: 'BOB' },
    name: 'Atelier',
    description: 'Una escena.',
  },
]

describe('productJsonLd', () => {
  it('publica precio en unidades y moneda BOB', () => {
    const [product] = productJsonLd(plans, 'es', SITE)
    expect(product?.['@type']).toBe('Product')
    expect(product?.offers.price).toBe('690.00')
    expect(product?.offers.priceCurrency).toBe('BOB')
    expect(product?.offers.availability).toBe('https://schema.org/InStock')
  })

  it('apunta al ancla de precios del idioma', () => {
    const [product] = productJsonLd(plans, 'en', SITE)
    expect(product?.offers.url).toBe('https://invitepremium.bo/en#precios')
  })
})

describe('faqJsonLd', () => {
  it('incluye una entrada por pregunta', () => {
    const faq = faqJsonLd(es)
    expect(faq['@type']).toBe('FAQPage')
    expect(faq.mainEntity).toHaveLength(es.faq.items.length)
    expect(faq.mainEntity[0]?.acceptedAnswer.text).toBe(es.faq.items[0].answer)
  })
})

describe('organizationJsonLd', () => {
  const negocio = { whatsapp: '+59170012345', direccion: '', ciudad: 'Cochabamba', pais: 'Bolivia', redes: ['https://instagram.com/x', ''] }

  it('publica el negocio con nombre, web, teléfono y dirección, los mismos del pie', () => {
    const organization = organizationJsonLd(negocio, SITE)
    expect(organization['@type']).toBe('LocalBusiness')
    expect(organization.url).toBe('https://invitepremium.bo')
    expect(organization.telephone).toBe('+59170012345')
    expect(organization.address).toEqual({ '@type': 'PostalAddress', addressLocality: 'Cochabamba', addressCountry: 'Bolivia' })
    expect(organization.sameAs).toEqual(['https://instagram.com/x'])
  })

  it('lo que no está configurado no se publica', () => {
    const organization = organizationJsonLd({ ...negocio, whatsapp: '', redes: [] }, SITE)
    expect(organization).not.toHaveProperty('telephone')
    expect(organization).not.toHaveProperty('sameAs')
  })
})

describe('jsonLdScript', () => {
  it('escapa "<" para que un dato con etiquetas no cierre el script', () => {
    expect(jsonLdScript({ name: '</script><img>' })).not.toContain('</script>')
    expect(jsonLdScript({ name: '</script>' })).toContain('\\u003c')
  })
})

describe('breadcrumbJsonLd', () => {
  it('numera las posiciones desde 1', () => {
    const breadcrumb = breadcrumbJsonLd([
      { name: 'Inicio', url: 'https://invitepremium.bo/es' },
      { name: 'Colecciones', url: 'https://invitepremium.bo/es/colecciones' },
    ])
    expect(breadcrumb.itemListElement.map((item) => item.position)).toEqual([1, 2])
  })
})
