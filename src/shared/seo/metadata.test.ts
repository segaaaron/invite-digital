import { describe, expect, it } from 'vitest'
import { buildAlternates, buildPageMetadata, truncateDescription } from './metadata'

const SITE = 'https://invitepremium.bo'

describe('buildAlternates', () => {
  it('genera canonical por idioma y x-default en inglés', () => {
    const alternates = buildAlternates('/es/colecciones', SITE)
    expect(alternates.canonical).toBe('https://invitepremium.bo/es/colecciones')
    expect(alternates.languages['es']).toBe('https://invitepremium.bo/es/colecciones')
    expect(alternates.languages['en']).toBe('https://invitepremium.bo/en/colecciones')
    expect(alternates.languages['x-default']).toBe('https://invitepremium.bo/en/colecciones')
  })

  it('funciona en la raíz de cada idioma', () => {
    const alternates = buildAlternates('/en', SITE)
    expect(alternates.canonical).toBe('https://invitepremium.bo/en')
    expect(alternates.languages['es']).toBe('https://invitepremium.bo/es')
  })

  it('en la portada, x-default apunta a la raíz que negocia el idioma', () => {
    expect(buildAlternates('/es', SITE).languages['x-default']).toBe('https://invitepremium.bo/')
  })

  it('no duplica la barra cuando SITE_URL termina en barra', () => {
    const alternates = buildAlternates('/es', 'https://invitepremium.bo/')
    expect(alternates.canonical).toBe('https://invitepremium.bo/es')
    expect(alternates.languages['en']).toBe('https://invitepremium.bo/en')
  })
})

describe('truncateDescription', () => {
  it('deja intacto un texto que cabe', () => {
    expect(truncateDescription('Invitaciones digitales', 155)).toBe('Invitaciones digitales')
  })

  it('corta en el último espacio y añade puntos suspensivos', () => {
    expect(truncateDescription('uno dos tres cuatro', 14)).toBe('uno dos tres…')
  })

  it('corta en seco un texto sin espacios', () => {
    expect(truncateDescription('a'.repeat(20), 10)).toBe(`${'a'.repeat(10)}…`)
  })
})

describe('buildPageMetadata', () => {
  it('lleva título, descripción y canonical al Open Graph', () => {
    const metadata = buildPageMetadata({
      locale: 'es',
      path: '/es',
      title: 'Invitaciones digitales de lujo',
      description: 'Sobres que se abren en 3D.',
      baseUrl: SITE,
    })

    expect(metadata.title).toBe('Invitaciones digitales de lujo')
    expect(metadata.openGraph?.url).toBe('https://invitepremium.bo/es')
    expect(metadata.alternates?.canonical).toBe('https://invitepremium.bo/es')
  })

  it('usa el locale de Open Graph correspondiente al idioma', () => {
    expect(buildPageMetadata({ locale: 'en', path: '/en', title: 't', description: 'd', baseUrl: SITE }).openGraph?.locale).toBe(
      'en_US',
    )
  })
})
