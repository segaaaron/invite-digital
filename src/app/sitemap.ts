import type { MetadataRoute } from 'next'
import { catalog } from '@/app/composition/container'
import { env } from '@/shared/config/env'
import { LOCALES } from '@/shared/i18n/locales'
import { isOk } from '@/shared/result'

// Same reason as the pages: it queries the catalog, so it cannot be built without a
// reachable database.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []

  for (const locale of LOCALES) {
    entries.push({ url: `${env.SITE_URL}/${locale}`, changeFrequency: 'weekly', priority: 1 })
    entries.push({ url: `${env.SITE_URL}/${locale}/colecciones`, changeFrequency: 'weekly', priority: 0.8 })

    const templates = await catalog.listTemplates(locale)
    // A catalog failure trims the sitemap for that language instead of failing the
    // whole file: a partial sitemap still indexes the landing pages.
    if (isOk(templates)) {
      for (const template of templates.value) {
        entries.push({ url: `${env.SITE_URL}/${locale}/colecciones/${template.slug}`, priority: 0.6 })
      }
    } else {
      console.error('Sitemap sin plantillas para', locale, templates.error.detail)
    }
  }

  return entries
}
