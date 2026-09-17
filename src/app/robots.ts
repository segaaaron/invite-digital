import type { MetadataRoute } from 'next'
import { env } from '@/shared/config/env'

// Igual que el sitemap: se resuelve por petición. Prerrenderizado, se quedaba con el
// SITE_URL de relleno que el Dockerfile pasa al compilar y anunciaba un sitemap en
// localhost, horneado en la imagen para siempre.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/panel', '/i/', '/compartir/', '/api', '/r/', '/qr-de-cobro', '/p/', '/v/'] },
      // Los que arman la vista previa del enlace al compartirlo por chat **sí** leen la invitación: el lector
      // de Meta —el de WhatsApp— respeta este fichero, y con `/i/` cerrado el enlace llegaba sin portada ni
      // título. No indexan; los buscadores siguen fuera, y la página lleva `noindex` igual.
      { userAgent: ['facebookexternalhit', 'Facebot', 'meta-externalagent', 'WhatsApp', 'TelegramBot', 'Twitterbot', 'Slackbot-LinkExpanding', 'Discordbot'], allow: ['/', '/i/'], disallow: ['/panel', '/compartir/', '/api', '/r/', '/qr-de-cobro', '/p/', '/v/'] },
    ],
    // No `host`: it is a Yandex-only, deprecated directive that expects a hostname,
    // not a URL with a scheme, and Google ignores it.
    sitemap: `${env.SITE_URL}/sitemap.xml`,
  }
}
