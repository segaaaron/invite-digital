import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { proxy } from './proxy'
import { LOCALE_COOKIE } from '@/shared/i18n/locales'

const pedir = (
  pathname: string,
  { acceptLanguage, cookie }: { acceptLanguage?: string; cookie?: string } = {},
): NextRequest => {
  const headers = new Headers()
  if (acceptLanguage !== undefined) headers.set('accept-language', acceptLanguage)
  if (cookie !== undefined) headers.set('cookie', `${LOCALE_COOKIE}=${cookie}`)
  return new NextRequest(new URL(pathname, 'https://ejemplo.bo'), { headers })
}

const csp = (response: ReturnType<typeof proxy>): string | null =>
  response.headers.get('Content-Security-Policy')

describe('negociación de idioma en la raíz', () => {
  it('redirige a español cuando el navegador lo pide', () => {
    const response = proxy(pedir('/', { acceptLanguage: 'es-BO,es;q=0.9,en;q=0.8' }))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://ejemplo.bo/es')
  })

  it('redirige a inglés cuando el navegador lo pide', () => {
    const response = proxy(pedir('/', { acceptLanguage: 'en-US,en;q=0.9' }))

    expect(response.headers.get('location')).toBe('https://ejemplo.bo/en')
  })

  it('cae al idioma por defecto con un idioma no soportado', () => {
    const response = proxy(pedir('/', { acceptLanguage: 'fr-FR,fr;q=0.9' }))

    expect(response.headers.get('location')).toBe('https://ejemplo.bo/en')
  })

  it('la cookie manda sobre la cabecera del navegador', () => {
    const response = proxy(pedir('/', { acceptLanguage: 'en-US,en;q=0.9', cookie: 'es' }))

    expect(response.headers.get('location')).toBe('https://ejemplo.bo/es')
  })

  it('recuerda la elección en una cookie de un año', () => {
    const response = proxy(pedir('/', { acceptLanguage: 'es' }))
    const cookie = response.cookies.get(LOCALE_COOKIE)

    expect(cookie?.value).toBe('es')
    expect(cookie?.maxAge).toBe(60 * 60 * 24 * 365)
  })
})

describe('rutas que no se redirigen', () => {
  // El fallo real que tuvo el proxy: redirigía cualquier ruta desconocida a
  // `/en/<ruta>`, así que /colecciones acababa en /en/colecciones en vez de dar 404.
  // Solo la raíz se negocia; el resto lo decide el layout de [locale].
  it('una ruta desconocida NO se redirige a /en/<ruta>', () => {
    const response = proxy(pedir('/colecciones', { acceptLanguage: 'en' }))

    expect(response.status).not.toBe(307)
    expect(response.headers.get('location')).toBeNull()
  })

  it('un idioma no soportado en la ruta se deja pasar para que responda 404', () => {
    const response = proxy(pedir('/fr', { acceptLanguage: 'fr' }))

    expect(response.status).not.toBe(307)
  })

  it('una ruta con idioma válido se sirve tal cual', () => {
    const response = proxy(pedir('/es/colecciones'))

    expect(response.status).not.toBe(307)
  })
})

describe('política de seguridad de contenido', () => {
  it('acompaña a las páginas con su nonce', () => {
    const politica = csp(proxy(pedir('/es')))

    expect(politica).toContain("script-src 'self' 'nonce-")
    expect(politica).toContain("frame-ancestors 'none'")
    expect(politica).toContain("object-src 'none'")
  })

  it('usa un nonce distinto en cada petición', () => {
    const primera = csp(proxy(pedir('/es')))
    const segunda = csp(proxy(pedir('/es')))

    expect(primera).not.toBe(segunda)
  })

  it('también protege las rutas sin idioma que se dejan pasar', () => {
    expect(csp(proxy(pedir('/panel')))).toContain("default-src 'self'")
  })

  // Estas rutas no son documentos: una política de contenido ahí no aporta nada y el
  // cuerpo lo genera Next, no una plantilla nuestra.
  it.each(['/api/cualquiera', '/_next/static/algo.js', '/robots.txt', '/sitemap.xml', '/favicon.ico'])(
    'no añade política a %s',
    (ruta) => {
      expect(csp(proxy(pedir(ruta)))).toBeNull()
    },
  )

  it('no añade política a un archivo con extensión', () => {
    expect(csp(proxy(pedir('/imagenes/plantilla.png')))).toBeNull()
  })
})
