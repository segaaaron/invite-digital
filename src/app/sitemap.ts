import type { MetadataRoute } from 'next'
import { catalog, site } from '@/app/composition/container'
import { env } from '@/shared/config/env'
import { LOCALES } from '@/shared/i18n/locales'
import { attempt, isOk } from '@/shared/result'

// Same reason as the pages: it queries the catalog, so it cannot be built without a
// reachable database.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []
  // Las páginas legales solo existen publicadas: anunciar una que responde 404 resta
  // confianza de rastreo a toda la web.
  const { legal } = await site.settings()

  for (const locale of LOCALES) {
    entries.push({ url: `${env.SITE_URL}/${locale}`, changeFrequency: 'weekly', priority: 1 })
    // Las dos fiestas tienen página propia: son las entradas principales de la web.
    entries.push({ url: `${env.SITE_URL}/${locale}/bodas`, changeFrequency: 'weekly', priority: 0.9 })
    entries.push({ url: `${env.SITE_URL}/${locale}/xv-anos`, changeFrequency: 'weekly', priority: 0.9 })

    // Only published routes belong here. The per-template detail page does not exist
    // yet, and announcing 16 URLs that answer 404 costs crawl trust across the site.
    // Add them back together with `colecciones/[slug]/page.tsx`.
    const templates = await listTemplatesSafely(locale)
    if (templates.length > 0) {
      entries.push({ url: `${env.SITE_URL}/${locale}/colecciones`, changeFrequency: 'weekly', priority: 0.8 })
    }
    if (legal.privacidad.publicada) entries.push({ url: `${env.SITE_URL}/${locale}/privacidad`, changeFrequency: 'yearly', priority: 0.2 })
    if (legal.terminos.publicada) entries.push({ url: `${env.SITE_URL}/${locale}/terminos`, changeFrequency: 'yearly', priority: 0.2 })
  }

  return entries
}

/**
 * The repository throws on a connection failure — it does not return an `err` — so the
 * `isOk` guard alone would let a database outage turn the sitemap into a 500.
 */
async function listTemplatesSafely(locale: (typeof LOCALES)[number]): Promise<readonly unknown[]> {
  const result = await attempt(
    () => catalog.listTemplates(locale),
    (cause) => ({ kind: 'not_found' as const, detail: cause instanceof Error ? cause.message : 'error desconocido' }),
  )

  if (isOk(result)) return result.value

  console.error('Sitemap sin colecciones para', locale, result.error.detail)
  return []
}
