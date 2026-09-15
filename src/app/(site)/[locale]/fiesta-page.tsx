import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { catalog, plans, site } from '@/app/composition/container'
import { sitioPublico } from '@/modules/admin/domain/site-settings'
import { PricingSection } from '@/modules/catalog/ui/PricingSection'
import type { Plan } from '@/modules/catalog'
import type { Fiesta } from '@/modules/events'
import { capacidadDePlan } from '@/modules/plans'
import { PlanComparison } from '@/modules/plans/ui/PlanComparison'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import { FiestaLanding } from '@/sections/FiestaLanding'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import { attempt, isOk } from '@/shared/result'
import { buildPageMetadata, truncateDescription } from '@/shared/seo/metadata'

/** La ruta de cada fiesta. Una sola fuente para la página, el sitemap y la cabecera. */
export const RUTA_DE_FIESTA: Record<Fiesta, string> = { boda: 'bodas', xv: 'xv-anos' }

/** Título y descripción: los que escribió el admin en «La web» o, vacíos, los del diccionario. */
export async function metadataDeFiesta(raw: string, fiesta: Fiesta): Promise<Metadata> {
  const locale = parseLocaleParam(raw)
  if (!locale) return {}
  const textos = getDictionary(locale).fiestas[fiesta]
  const seo = (await site.settings()).seo[fiesta === 'boda' ? 'bodas' : 'xv']
  return buildPageMetadata({
    locale,
    path: `/${locale}/${RUTA_DE_FIESTA[fiesta]}`,
    title: seo.titulo[locale] || textos.seoTitle,
    description: truncateDescription(seo.descripcion[locale] || textos.seoDescription),
  })
}

/**
 * La tabla que compara los planes, con los límites de la base en el orden de las tarjetas.
 * Si los límites no se leen, no hay tabla: mejor sin ella que con una que invente.
 */
export async function comparativaDePlanes(planes: readonly Plan[], dictionary: Dictionary) {
  const filas = await plans.listActive().catch((cause: unknown) => {
    console.error('Precios sin tabla comparativa:', cause)
    return []
  })
  const columnas = planes.flatMap((plan) => {
    const fila = filas.find((f) => f.slug === plan.slug)
    return fila === undefined ? [] : [{ nombre: plan.name, limites: capacidadDePlan(fila) }]
  })
  return columnas.length === 0 ? null : <PlanComparison planes={columnas} textos={dictionary.pricing.comparison} />
}

/**
 * La página de una fiesta. Como la portada, lee Postgres por petición y degrada sección por
 * sección si la base no responde: sin catálogo se queda sin modelos ni precios, no en 500.
 */
export async function PaginaDeFiesta({ raw, fiesta }: { raw: string; fiesta: Fiesta }) {
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()
  const dictionary = getDictionary(locale)
  const sitio = sitioPublico(await site.settings(), locale)

  const fallo = (cause: unknown) => ({ kind: 'not_found' as const, detail: cause instanceof Error ? cause.message : 'error desconocido' })
  const [planes, plantillas] = await Promise.all([
    attempt(() => catalog.listPlans(locale), fallo),
    attempt(() => catalog.listTemplates(locale), fallo),
  ])
  if (!isOk(planes)) console.error('Página de fiesta sin planes:', planes.error.detail)
  if (!isOk(plantillas)) console.error('Página de fiesta sin modelos:', plantillas.error.detail)

  return (
    <FiestaLanding
      dictionary={dictionary}
      fiesta={fiesta}
      locale={locale}
      pricing={
        isOk(planes) && planes.value.length > 0 ? (
          <PricingSection
            comparativa={await comparativaDePlanes(planes.value, dictionary)}
            contacto={{ whatsapp: sitio.whatsapp, mensajePlan: sitio.mensajePlan }}
            dictionary={dictionary}
            locale={locale}
            modelo={null}
            plans={planes.value}
          />
        ) : null
      }
      templates={isOk(plantillas) ? plantillas.value : []}
    />
  )
}
