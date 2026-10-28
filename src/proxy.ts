import { NextResponse, type NextRequest } from 'next/server'
import { NONCE_HEADER, PATHNAME_HEADER } from '@/shared/config/headers'
import { isLocale } from '@/shared/i18n/locales'
import { negotiateLocale } from '@/shared/i18n/negotiate'
import { rutaInterna, rutaPublica } from '@/shared/i18n/rutas'
import { rutaInternaDelPanel, rutaPublicaDelPanel } from '@/shared/rutas/panel'
import { buildContentSecurityPolicy, createNonce } from '@/shared/security/csp'

/**
 * Un fichero público: el último trozo de la ruta lleva un punto con algo detrás (`/logo.svg`).
 * Sin regex a propósito: `/\.[^/]+$/` volvía atrás en cada punto y una ruta de miles de `.`
 * con `/` al final colgaba el único contenedor.
 */
const esFicheroPublico = (pathname: string): boolean => {
  const ultimo = pathname.slice(pathname.lastIndexOf('/') + 1)
  const punto = ultimo.lastIndexOf('.')
  // Un punto con algo detrás. Recortar el último carácter en vez de esto se dejaba fuera
  // una extensión de una sola letra (`/mapa.c`), y era una trampa para quien lo leyera.
  return punto !== -1 && punto < ultimo.length - 1
}

/**
 * Descargas privadas que se sirven con su propia política, `sandbox`. El proxy no les pone
 * la de la página encima: pisarla deja un PDF abierto en línea ejecutando guion en el origen
 * del panel, que es justo lo que esa cabecera impide. Le pasaba al comprobante desde el Plan B.
 */
const DESCARGA_PRIVADA = /^\/panel\/(pedidos\/comprobante|eventos\/[^/]+\/documentos)\/[^/]+$/

/**
 * The nonce travels to the render through a request header, which is how a Server
 * Component reads it (`headers()`); the response carries the policy that matches it.
 *
 * La ruta viaja por el mismo camino y por un motivo concreto: un Server Component no
 * puede saber en qué dirección está, y el guard de sesión lo necesita para no mandar a
 * cambiar la contraseña a quien **ya** está en esa pantalla. Sin ella, `/panel/cuenta` se
 * redirigía a sí misma en bucle y las diez páginas de esa carcasa quedaban inalcanzables.
 *
 * Se pone aquí, en `withCsp`, porque es por donde pasan **todas** las rutas del panel: la
 * rama de más abajo solo atiende la raíz sin idioma.
 */
function withCsp(request: NextRequest, reescribirA?: string): NextResponse {
  const nonce = createNonce()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(NONCE_HEADER, nonce)
  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname)

  const response =
    reescribirA === undefined
      ? NextResponse.next({ request: { headers: requestHeaders } })
      : NextResponse.rewrite(new URL(reescribirA + request.nextUrl.search, request.url), { request: { headers: requestHeaders } })
  response.headers.set(
    'Content-Security-Policy',
    buildContentSecurityPolicy(nonce, { dev: process.env.NODE_ENV !== 'production' }),
  )
  return response
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    esFicheroPublico(pathname) ||
    // Next pone la imagen al compartir con su carpeta interna (`/en/bodas/opengraph-image-…`): se sirve ahí, sin
    // mudarla, para que WhatsApp y Facebook no tengan que seguir un 308.
    pathname.includes('/opengraph-image')
  ) {
    return NextResponse.next()
  }

  // La descarga privada se reconoce por su ruta **interna** (de puertas afuera llega en inglés) y
  // se sirve **sin** la política de la página: lleva la suya, `sandbox`, y pisarla dejaría un PDF
  // ejecutando guion en el origen del panel. Lo único que necesita del proxy es la traducción.
  const descarga = rutaInternaDelPanel(pathname)
  if (DESCARGA_PRIVADA.test(descarga)) {
    return descarga === pathname ? NextResponse.next() : NextResponse.rewrite(new URL(descarga + request.nextUrl.search, request.url))
  }

  // El panel vive en inglés de puertas afuera (`rutas/panel.ts`): `/dashboard/...` se sirve desde
  // su carpeta en español, y la dirección vieja (`/panel/...`, la de los correos ya enviados y los
  // marcadores) se muda para siempre a la nueva.
  const panelInterno = rutaInternaDelPanel(pathname)
  if (panelInterno !== pathname) return withCsp(request, panelInterno)
  const panelPublico = rutaPublicaDelPanel(pathname)
  if (panelPublico !== pathname) {
    const url = request.nextUrl.clone()
    url.pathname = panelPublico
    return NextResponse.redirect(url, 308)
  }

  // Cada idioma con sus direcciones (`rutas.ts`): la pública se sirve desde su carpeta, y la vieja
  // (`/en/bodas`, `/modelos/es/x`) se muda para siempre a la pública, con lo que Google ya tenía indexado.
  const interna = rutaInterna(pathname)
  if (interna !== pathname) return withCsp(request, interna)
  const publica = rutaPublica(pathname)
  if (publica !== pathname) {
    const url = request.nextUrl.clone()
    url.pathname = publica
    return NextResponse.redirect(url, 308)
  }

  const segment = pathname.split('/')[1] ?? ''
  if (isLocale(segment)) return withCsp(request)

  // Solo la raíz sin idioma se negocia y redirige. Cualquier otro segmento
  // (p. ej. /fr) se deja pasar: el layout de [locale] decide y responde 404
  // real para idiomas no soportados, en vez de un redirect a ciegas.
  if (pathname !== '/') return withCsp(request)

  // Siempre el idioma del aparato (14 oct, sin selector ni recuerdo): si no es español ni inglés, inglés.
  const locale = negotiateLocale({ acceptLanguage: request.headers.get('accept-language') })

  const url = request.nextUrl.clone()
  url.pathname = `/${locale}`
  const response = NextResponse.redirect(url, 307)
  // La raíz es el x-default: responde según el idioma, y las cachés lo tienen que saber.
  response.headers.set('Vary', 'Accept-Language')
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
