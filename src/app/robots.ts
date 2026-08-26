import type { MetadataRoute } from 'next'
import { env } from '@/shared/config/env'

// Igual que el sitemap: se resuelve por petición. Prerrenderizado, se quedaba con el
// SITE_URL de relleno que el Dockerfile pasa al compilar y anunciaba un sitemap en
// localhost, horneado en la imagen para siempre.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/panel', '/i/', '/compartir/', '/api', '/r/', '/qr-de-cobro'] }],
    // No `host`: it is a Yandex-only, deprecated directive that expects a hostname,
    // not a URL with a scheme, and Google ignores it.
    sitemap: `${env.SITE_URL}/sitemap.xml`,
  }
}
