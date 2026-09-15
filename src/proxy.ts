import { NextResponse, type NextRequest } from 'next/server'
import { NONCE_HEADER, PATHNAME_HEADER } from '@/shared/config/headers'
import { LOCALE_COOKIE, isLocale } from '@/shared/i18n/locales'
import { negotiateLocale } from '@/shared/i18n/negotiate'
import { buildContentSecurityPolicy, createNonce } from '@/shared/security/csp'

const PUBLIC_FILE = /\.[^/]+$/

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
function withCsp(request: NextRequest): NextResponse {
  const nonce = createNonce()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(NONCE_HEADER, nonce)
  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
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
    PUBLIC_FILE.test(pathname) ||
    DESCARGA_PRIVADA.test(pathname)
  ) {
    return NextResponse.next()
  }

  const segment = pathname.split('/')[1] ?? ''
  if (isLocale(segment)) return withCsp(request)

  // Solo la raíz sin idioma se negocia y redirige. Cualquier otro segmento
  // (p. ej. /fr) se deja pasar: el layout de [locale] decide y responde 404
  // real para idiomas no soportados, en vez de un redirect a ciegas.
  if (pathname !== '/') return withCsp(request)

  const locale = negotiateLocale({
    cookie: request.cookies.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: request.headers.get('accept-language'),
  })

  const url = request.nextUrl.clone()
  url.pathname = `/${locale}`
  const response = NextResponse.redirect(url, 307)
  response.cookies.set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
