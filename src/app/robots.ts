import type { MetadataRoute } from 'next'
import { env } from '@/shared/config/env'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/panel', '/i/', '/compartir/', '/api'] }],
    // No `host`: it is a Yandex-only, deprecated directive that expects a hostname,
    // not a URL with a scheme, and Google ignores it.
    sitemap: `${env.SITE_URL}/sitemap.xml`,
  }
}
