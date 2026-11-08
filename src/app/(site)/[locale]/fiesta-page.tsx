import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { asistente, site, webPublica } from '@/app/composition/container'
import { tieneLuxury } from '@/modules/asistente'
import { PricingSection } from '@/modules/catalog/ui/PricingSection'
import type { Plan } from '@/modules/catalog'
import type { FiestaPublica } from '@/modules/events'
import { capacidadDePlan } from '@/modules/plans'
import { PlanComparison } from '@/modules/plans/ui/PlanComparison'
import { formatMoney } from '@/modules/catalog'
import { filasDeLaTabla, lineasQueIncluyenTodos, preciosDeLaTabla } from '@/sections/portada/filas'
import type { Dictionary } from '@/shared/i18n/dictionaries'
import { FiestaLanding } from '@/sections/FiestaLanding'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import type { Locale } from '@/shared/i18n/locales'
import { attempt, isOk } from '@/shared/result'
import { buildAlternates, buildPageMetadata, truncateDescription } from '@/shared/seo/metadata'
import { breadcrumbJsonLd, jsonLdScript } from '@/shared/seo/json-ld'
import { headers } from 'next/headers'
import { NONCE_HEADER } from '@/shared/config/headers'
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
 * La tabla que compara los planes: **la misma que la de la portada** (documento del 6 nov: «las tarjetas y
 * la tabla deben quedar iguales a las de la página principal»). Mismas filas en el mismo orden, mismo
 * recuadro de lo que traen todos y mismos extras con precio en la celda; solo cambia la piel.
 *
 * Los límites salen de la base, en el orden de las tarjetas. Si no se leen, no hay tabla: mejor sin ella
 * que con una que invente.
 */
export async function comparativaDePlanes(planes: readonly Plan[], dictionary: Dictionary, locale: Locale) {
  const leidas = await webPublica.planesActivos().catch((cause: unknown) => {
    registrarFallo('[locale]/fiesta-page', 'no se pudo armar la tabla comparativa de precios:', cause)
    return null
  })
  const filas = leidas === null || !leidas.ok ? [] : leidas.value
  // Luxury se vende solo si existe (clave de OpenAI) y en los planes que lo traen según Admin › Asistente,
  // la misma regla que enseña el botón en el panel.
  const config = asistente.disponible ? await asistente.config().catch(() => null) : null
  const columnas = planes.flatMap((plan) => {
    const fila = filas.find((f) => f.slug === plan.slug)
    if (fila === undefined) return []
    const limites = capacidadDePlan(fila)
    return [
      {
        nombre: plan.name,
        limites: config === null ? limites : { ...limites, asistente: tieneLuxury(limites, config) },
        // El precio bajo el nombre y la columna del más elegido resaltada, como en la maqueta (20 oct).
        precio: formatMoney(plan.price, locale),
        ...(plan.priceBeforeCents !== null && plan.priceBeforeCents > plan.price.cents
          ? { precioAntes: formatMoney({ cents: plan.priceBeforeCents, currency: plan.price.currency }, locale) }
          : {}),
        destacado: plan.highlighted,
      },
    ]
  })
  const extrasLeidos = await webPublica.extrasActivos().catch(() => null)
  const moneda = planes[0]?.price.currency ?? 'BOB'
  // Solo los extras en la moneda de la página (un importe en otra con la etiqueta de esta sería un precio equivocado).
  const extras = (extrasLeidos === null || !extrasLeidos.ok ? [] : extrasLeidos.value).filter((x) => x.currency === moneda && (config !== null || x.effect !== 'asistente'))
  const comparativa = dictionary.pricing.comparison
  const conTope = columnas.some((c) => c.limites.maxGuestGroups !== null)
  const textos = { ...comparativa, filas: filasDeLaTabla(comparativa, { conTope, conLuxury: config !== null }) }
  const { precios, notas } = preciosDeLaTabla(extras, (cents) => formatMoney({ cents, currency: moneda }, locale), comparativa)
  return columnas.length === 0 ? null : (
    <PlanComparison incluyen={lineasQueIncluyenTodos(dictionary, conTope)} notas={notas} planes={columnas} precios={precios} textos={textos} />
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

  // Las migas (Inicio › Bodas) para Google, como Colecciones.
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined
  const migas = breadcrumbJsonLd([
    { name: dictionary.seo.breadcrumbHome, url: buildAlternates(`/${locale}`).canonical },
    { name: fiesta === 'boda' ? dictionary.nav.weddings : dictionary.nav.quinceaneras, url: buildAlternates(`/${locale}/${RUTA_DE_FIESTA[fiesta]}`).canonical },
  ])

  return (
    <>
    <script dangerouslySetInnerHTML={{ __html: jsonLdScript(migas) }} nonce={nonce} type="application/ld+json" />
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
    </>
  )
}
