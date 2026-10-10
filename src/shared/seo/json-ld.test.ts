import { describe, expect, it } from 'vitest'
import { es } from '@/shared/i18n/messages/es'
import { breadcrumbJsonLd, faqJsonLd, jsonLdScript, organizationJsonLd, productJsonLd, type PricedPlan, websiteJsonLd } from './json-ld'

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
    // Sin precio en dólares, una sola oferta en bolivianos.
    expect(product?.offers).toMatchObject({ price: '690.00', priceCurrency: 'BOB', availability: 'https://schema.org/InStock' })
  })

  it('apunta al ancla de precios del idioma', () => {
    const [product] = productJsonLd(plans, 'en', SITE)
    expect(product?.offers).toMatchObject({ url: 'https://invitepremium.bo/en#precios' })
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

  it('publica el negocio con nombre, web y teléfono, y nunca dónde está (9 oct: no dice desde dónde trabaja)', () => {
    const organization = organizationJsonLd(negocio, SITE)
    expect(organization['@type']).toBe('Organization')
    expect(organization.url).toBe('https://invitepremium.bo')
    expect(organization.telephone).toBe('+59170012345')
    expect(organization).not.toHaveProperty('address')
    expect(organization.areaServed).toEqual(['Latin America', 'United States', 'Canada'])
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

describe('SEO para toda América (9 oct)', () => {
  it('una organización en línea, con sus idiomas y dónde atiende, sin dirección', () => {
    const o = organizationJsonLd({ whatsapp: '', direccion: '', ciudad: '', pais: '', redes: [], correo: 'hola@luxuryatelier.net' }, 'https://luxuryatelier.net')
    expect(o['@type']).toBe('Organization')
    expect(o.areaServed).toEqual(['Latin America', 'United States', 'Canada'])
    expect(o.knowsLanguage).toEqual(['es', 'en'])
    expect(o.logo).toBe('https://luxuryatelier.net/icon.png')
    expect(o.email).toBe('hola@luxuryatelier.net')
  })
  it('el precio también en dólares cuando el plan lo tiene', () => {
    const [p] = productJsonLd([{ slug: 'gala', name: 'Gala', description: 'd', price: { cents: 69000, currency: 'BOB' }, priceUsdCents: 9900 }], 'en', 'https://luxuryatelier.net')
    expect(p!.offers).toEqual([
      expect.objectContaining({ price: '690.00', priceCurrency: 'BOB' }),
      expect.objectContaining({ price: '99.00', priceCurrency: 'USD' }),
    ])
  })
  it('el sitio, en el idioma de la página', () => {
    expect(websiteJsonLd('es', 'https://luxuryatelier.net')).toMatchObject({ '@type': 'WebSite', inLanguage: 'es', url: 'https://luxuryatelier.net/es' })
  })
})
