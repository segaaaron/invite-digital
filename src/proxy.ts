import { NextResponse, type NextRequest } from 'next/server'
import { LOCALE_COOKIE, isLocale } from '@/shared/i18n/locales'
import { negotiateLocale } from '@/shared/i18n/negotiate'
import { buildContentSecurityPolicy, createNonce } from '@/shared/security/csp'

const PUBLIC_FILE = /\.[^/]+$/
const NONCE_HEADER = 'x-nonce'

/**
 * The nonce travels to the render through a request header, which is how a Server
 * Component reads it (`headers()`); the response carries the policy that matches it.
 */
function withCsp(request: NextRequest): NextResponse {
  const nonce = createNonce()
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(NONCE_HEADER, nonce)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', buildContentSecurityPolicy(nonce))
  return response
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    PUBLIC_FILE.test(pathname)
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
