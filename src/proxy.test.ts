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

  it('sigue al aparato aunque quede una cookie vieja, y no deja ninguna', () => {
    const response = proxy(pedir('/', { acceptLanguage: 'en-US,en;q=0.9', cookie: 'es' }))

    expect(response.headers.get('location')).toBe('https://ejemplo.bo/en')
    expect(response.cookies.get(LOCALE_COOKIE)).toBeUndefined()
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
    expect(politica).toContain("frame-ancestors 'self'")
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

  it('una extensión de una sola letra sigue siendo archivo', () => {
    expect(csp(proxy(pedir('/mapa.c')))).toBeNull()
  })

  it('un punto en una carpeta o al final no la vuelve archivo', () => {
    expect(csp(proxy(pedir('/es/v1.2/boda')))).not.toBeNull()
    expect(csp(proxy(pedir('/es/boda.')))).not.toBeNull()
  })

  it('una ruta de miles de puntos no cuelga el proxy', () => {
    const inicio = performance.now()
    proxy(pedir(`/${'.'.repeat(20_000)}/`))
    expect(performance.now() - inicio).toBeLessThan(50)
  })
})

describe('las descargas privadas llevan su propia política', () => {
  // Un comprobante o un contrato se sirven con `CSP: sandbox`. Si el proxy les pone la
  // política de la página encima, un PDF abierto en línea vuelve a poder ejecutar guion.
  it('no pisa la política de un comprobante ni de un documento del evento', () => {
    expect(csp(proxy(pedir('/panel/pedidos/comprobante/abc')))).toBeNull()
    expect(csp(proxy(pedir('/panel/eventos/boda-ana/documentos/abc')))).toBeNull()
  })

  it('y sigue poniéndola en las páginas del panel', () => {
    expect(csp(proxy(pedir('/panel/eventos/boda-ana/planner/documentos')))).not.toBeNull()
  })
})

describe('cada idioma con sus direcciones (14 oct)', () => {
  it('la dirección inglesa se sirve desde su carpeta, con la política puesta', () => {
    const r = proxy(pedir('/en/weddings'))
    expect(r.headers.get('x-middleware-rewrite')).toBe('https://ejemplo.bo/en/bodas')
    expect(csp(r)).toContain("default-src 'self'")
  })

  it('el modelo se sirve desde /modelos/<idioma>/<clave> conservando la consulta', () => {
    expect(proxy(pedir('/en/designs/boda-bot?x=1')).headers.get('x-middleware-rewrite')).toBe('https://ejemplo.bo/modelos/en/boda-bot?x=1')
  })

  it('la dirección vieja se muda para siempre a la nueva', () => {
    for (const [vieja, nueva] of [
      ['/en/bodas', '/en/weddings'],
      ['/modelos/es/boda-bot', '/es/modelos/boda-bot'],
      ['/en/pedido/ref/AB', '/en/order/ref/AB'],
    ] as const) {
      const r = proxy(pedir(vieja))
      expect(r.status).toBe(308)
      expect(r.headers.get('location')).toBe(`https://ejemplo.bo${nueva}`)
    }
  })

  it('la imagen al compartir se sirve en la dirección que Next escribe, sin mudarla', () => {
    const r = proxy(pedir('/en/bodas/opengraph-image-1c05fg?abc'))
    expect(r.headers.get('location')).toBeNull()
    expect(r.headers.get('x-middleware-rewrite')).toBeNull()
  })

  it('la música de los modelos y el español no se tocan', () => {
    expect(proxy(pedir('/modelos/musica/boda-bot')).headers.get('location')).toBeNull()
    expect(proxy(pedir('/es/bodas')).headers.get('location')).toBeNull()
    expect(proxy(pedir('/es/bodas')).headers.get('x-middleware-rewrite')).toBeNull()
  })

  it('la raíz avisa a las cachés de que depende del idioma', () => {
    expect(proxy(pedir('/', { acceptLanguage: 'es' })).headers.get('Vary')).toBe('Accept-Language')
  })
})
