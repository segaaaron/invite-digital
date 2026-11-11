import type { MetadataRoute } from 'next'
import { env } from '@/shared/config/env'

// Igual que el sitemap: se resuelve por petición. Prerrenderizado, se quedaba con el
// SITE_URL de relleno que el Dockerfile pasa al compilar y anunciaba un sitemap en
// localhost, horneado en la imagen para siempre.
export const dynamic = 'force-dynamic'

// Un bot con grupo propio IGNORA el grupo `*` (RFC 9309): cada grupo con nombre repite esta lista.
const PRIVADO = ['/dashboard', '/i/', '/abierta/', '/guarda/', '/compartir/', '/api', '/r/', '/qr-de-cobro', '/p/', '/v/', '/calendario/', '/es/opinion/', '/en/opinion/']

// Buscan y citan con enlace: siempre dentro.
const BUSCADORES_IA = ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot', 'Amzn-SearchBot']

// Solo entrenamiento de modelos (decisión del 11 nov: opción C). `Google-Extended` queda fuera de la lista
// a propósito: bloquearlo también quita el grounding de Gemini. Para permitir todo, poner la bandera en false.
const BLOQUEAR_ENTRENAMIENTO = true
const ENTRENAMIENTO = ['GPTBot', 'ClaudeBot', 'CCBot', 'Amazonbot', 'Applebot-Extended', 'cohere-ai']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVADO },
      { userAgent: BUSCADORES_IA, allow: '/', disallow: PRIVADO },
      BLOQUEAR_ENTRENAMIENTO
        ? { userAgent: ENTRENAMIENTO, disallow: '/' }
        : { userAgent: ENTRENAMIENTO, allow: '/', disallow: PRIVADO },
      // Los que arman la vista previa del enlace al compartirlo por chat **sí** leen la invitación: el lector
      // de Meta —el de WhatsApp— respeta este fichero, y con `/i/` cerrado el enlace llegaba sin portada ni
      // título. No indexan; los buscadores siguen fuera, y la página lleva `noindex` igual.
      { userAgent: ['facebookexternalhit', 'Facebot', 'WhatsApp', 'TelegramBot', 'Twitterbot', 'Slackbot-LinkExpanding', 'Discordbot'], allow: ['/', '/i/', '/guarda/'], disallow: ['/dashboard', '/compartir/', '/api', '/r/', '/qr-de-cobro', '/p/', '/v/', '/calendario/', '/es/opinion/', '/en/opinion/'] },
    ],
    // No `host`: it is a Yandex-only, deprecated directive that expects a hostname,
    // not a URL with a scheme, and Google ignores it.
    sitemap: `${env.SITE_URL}/sitemap.xml`,
  }
}
