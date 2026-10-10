import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { asistente, site, webPublica } from '@/app/composition/container'
import { tieneLuxury } from '@/modules/asistente'
import { PricingSection } from '@/modules/catalog/ui/PricingSection'
import type { Plan } from '@/modules/catalog'
import type { FiestaPublica } from '@/modules/events'
import { capacidadDePlan } from '@/modules/plans'
import { PlanComparison } from '@/modules/plans/ui/PlanComparison'
import { Monto } from '@/modules/catalog/ui/Monto'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import { FiestaLanding } from '@/sections/FiestaLanding'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import type { Locale } from '@/shared/i18n/locales'
import { attempt, isOk } from '@/shared/result'
import { buildPageMetadata, truncateDescription } from '@/shared/seo/metadata'
import { registrarFallo } from '@/shared/observability/fallos'

/**
 * La ruta de cada fiesta que la web vende. Una sola fuente para la página, el sitemap y la
 * cabecera. El cumpleaños no está: no tiene página pública, y por eso todo lo de aquí pide
 * `FiestaPublica` y no `Fiesta`.
 */
export const RUTA_DE_FIESTA: Record<FiestaPublica, string> = { boda: 'bodas', xv: 'xv-anos' }

/** Título y descripción: los que escribió el admin en «La web» o, vacíos, los del diccionario. */
export async function metadataDeFiesta(raw: string, fiesta: FiestaPublica): Promise<Metadata> {
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
export async function comparativaDePlanes(planes: readonly Plan[], dictionary: Dictionary, locale: Locale) {
  const leidas = await webPublica.planesActivos().catch((cause: unknown) => {
    registrarFallo('[locale]/fiesta-page', 'Precios sin tabla comparativa:', cause)
    return null
  })
  const filas = leidas === null || !leidas.ok ? [] : leidas.value
  // Luxury se vende solo si existe (clave de OpenAI) y en los planes que lo traen según Admin › Asistente,
  // la misma regla que enseña el botón en el panel.
  const config = asistente.disponible ? await asistente.config().catch(() => null) : null
  const columnas = planes.flatMap((plan) => {
    const fila = filas.find((f) => f.slug === plan.slug)
    if (fila === undefined) return []
    const encargo = fila.correctionRounds != null && fila.deliveryDays != null ? { rondas: fila.correctionRounds, dias: fila.deliveryDays } : null
    const limites = capacidadDePlan(fila)
    return [{ nombre: plan.name, limites: config === null ? limites : { ...limites, asistente: tieneLuxury(limites, config) }, encargo }]
  })
  const extrasLeidos = await webPublica.extrasActivos().catch(() => null)
  const extras = (extrasLeidos === null || !extrasLeidos.ok ? [] : extrasLeidos.value).filter((x) => config !== null || x.effect !== 'asistente')
  const comparativa = dictionary.pricing.comparison
  const filasVisibles = Object.fromEntries(Object.entries(comparativa.filas).filter(([clave]) => config !== null || clave !== 'luxury')) as Partial<typeof comparativa.filas>
  const textos = { ...comparativa, filas: filasVisibles }
  return columnas.length === 0 ? null : (
    <PlanComparison extras={extras.map((x) => ({ name: x.name, precio: <Monto cents={x.priceCents} locale={locale} />, descripcion: comparativa.extrasDescripcion[x.effect] }))} planes={columnas} textos={textos} />
  )
}

/** Si algún plan activo es de diseño por encargo (tiene rondas y días de entrega). */
export async function hayEncargo(): Promise<boolean> {
  const leidas = await webPublica.planesActivos().catch(() => null)
  return leidas !== null && leidas.ok && leidas.value.some((f) => f.correctionRounds != null && f.deliveryDays != null)
}

/** La reserva fija de cada plan activo (centavos), por su `slug`. Sin leer la base, ninguna. */
export async function reservasDePlanes(): Promise<Record<string, number>> {
  const leidas = await webPublica.planesActivos().catch(() => null)
  if (leidas === null || !leidas.ok) return {}
  return Object.fromEntries(
    leidas.value.flatMap((f) => (f.depositFixedCents != null && f.priceCents !== undefined && f.depositFixedCents < f.priceCents ? [[f.slug, f.depositFixedCents] as const] : [])),
  )
}

/**
 * La página de una fiesta. Como la portada, lee Postgres por petición y degrada sección por
 * sección si la base no responde: sin catálogo se queda sin modelos ni precios, no en 500.
 */
export async function PaginaDeFiesta({ raw, fiesta }: { raw: string; fiesta: FiestaPublica }) {
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()
  const dictionary = getDictionary(locale)
  const fallo = (cause: unknown) => ({ kind: 'not_found' as const, detail: cause instanceof Error ? cause.message : 'error desconocido' })
  const [planes, plantillas] = await Promise.all([
    attempt(() => webPublica.planes(locale), fallo),
    attempt(() => webPublica.modelos(locale), fallo),
  ])
  if (!isOk(planes)) registrarFallo('[locale]/fiesta-page', 'Página de fiesta sin planes:', planes.error.detail)
  if (!isOk(plantillas)) registrarFallo('[locale]/fiesta-page', 'Página de fiesta sin modelos:', plantillas.error.detail)

  return (
    <FiestaLanding
      dictionary={dictionary}
      fiesta={fiesta}
      locale={locale}
      pricing={
        isOk(planes) && planes.value.length > 0 ? (
          <PricingSection
            comparativa={await comparativaDePlanes(planes.value, dictionary, locale)}
            reservas={await reservasDePlanes()}
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
