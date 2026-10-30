import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { NONCE_HEADER } from '@/shared/config/headers'
import { notFound } from 'next/navigation'
import { asistente, site, webPublica } from '@/app/composition/container'
import { sitioPublico } from '@/modules/admin/domain/site-settings'
import { tieneLuxury } from '@/modules/asistente'
import { capacidadDePlan } from '@/modules/plans'
import { formatMoney } from '@/modules/catalog'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import { attempt, isOk } from '@/shared/result'
import { faqJsonLd, jsonLdScript, organizationJsonLd, productJsonLd, websiteJsonLd } from '@/shared/seo/json-ld'
import { buildPageMetadata, truncateDescription } from '@/shared/seo/metadata'
import { Portada, type DisenoDePortada } from '@/sections/portada/Portada'
import type { ColumnaDeComparativa } from '@/sections/portada/Comparativa'
import { registrarFallo } from '@/shared/observability/fallos'
import { submitConsultationAction } from '@/app/_acciones/leads/actions'

// Se pinta por petición, no se prerenderiza: lee Postgres, y la imagen se construye en CI,
// donde la base no existe. Las consultas van por índice y a una base de la misma red.
export const dynamic = 'force-dynamic'

/**
 * Las nueve portadas del abanico de entrada, alternando los dos mundos. Son preferencias, no
 * una lista cerrada: lo que no esté a la venta se cae y entra el siguiente del catálogo, así
 * que retirar un modelo en el admin nunca deja un hueco.
 */
const ABANICO = ['xv-isabelle', 'boda-boho', 'xv-mariana', 'boda-cin', 'boda-glamour', 'xv-valeria', 'boda-navy', 'xv-luciana', 'boda-sello'] as const

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) return {}

  const dictionary = getDictionary(locale)
  // El título y la descripción que escribió el admin en «La web»; vacíos, los de siempre.
  const seo = (await site.settings()).seo.inicio

  return buildPageMetadata({
    locale,
    path: `/${locale}`,
    title: seo.titulo[locale] || dictionary.seo.homeTitle,
    description: truncateDescription(seo.descripcion[locale] || dictionary.seo.homeDescription),
  })
}

export default async function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params
  const locale = parseLocaleParam(raw)
  if (!locale) notFound()

  const dictionary = getDictionary(locale)

  // El proxy pone el nonce de la CSP en la petición; sin él, la política rechaza estos bloques.
  const nonce = (await headers()).get(NONCE_HEADER) ?? undefined

  // Los repositorios lanzan si Postgres no responde: cada lectura va envuelta, y una caída de
  // la base degrada la página sección por sección en vez de devolver un 500.
  const asOutage = (cause: unknown) => ({ kind: 'not_found' as const, detail: cause instanceof Error ? cause.message : 'error desconocido' })

  const ajustes = await site.settings()
  const sitio = sitioPublico(ajustes, locale)

  const [plansResult, templatesResult] = await Promise.all([
    attempt(() => webPublica.planes(locale), asOutage),
    attempt(() => webPublica.modelos(locale), asOutage),
  ])
  if (!isOk(plansResult)) registrarFallo('[locale]/page', 'No se pudieron cargar los planes de precios:', plansResult.error.detail)
  if (!isOk(templatesResult)) registrarFallo('[locale]/page', 'No se pudieron cargar las plantillas del catálogo:', templatesResult.error.detail)

  const plans = isOk(plansResult) ? plansResult.value : []
  const templates = isOk(templatesResult) ? templatesResult.value : []

  // La reserva fija de cada plan, tal como la dejó el admin. Sin ella no se inventa ninguna.
  const activos = await webPublica.planesActivos().catch((cause: unknown) => {
    registrarFallo('[locale]/page', 'No se pudieron leer los planes activos:', cause)
    return null
  })
  if (activos !== null && !activos.ok) {
    registrarFallo('[locale]/page', 'Los planes activos llegaron con error:', activos.error)
  }
  const filas = activos === null || !activos.ok ? [] : activos.value
  const reservas = Object.fromEntries(
    filas.flatMap((f) => (f.depositFixedCents != null && f.priceCents !== undefined && f.depositFixedCents < f.priceCents ? [[f.slug, f.depositFixedCents] as const] : [])),
  )

  // La comparativa sale de los límites de cada plan en la base, los mismos que corta el
  // servidor: una tabla escrita a mano acaba prometiendo lo que el plan no trae.
  const config = asistente.disponible
    ? await asistente.config().catch((cause: unknown) => {
        // Sin registro, una caída de la configuración se leía igual que «no hay clave»: la fila de
        // Luxury desaparecía de la comparativa y nadie se enteraba.
        registrarFallo('[locale]/page', 'No se pudo leer la configuración del asistente:', cause)
        return null
      })
    : null
  const columnas: ColumnaDeComparativa[] = plans.flatMap((plan) => {
    const fila = filas.find((f) => f.slug === plan.slug)
    if (fila === undefined) {
      // Un plan publicado que no está entre los activos es un desajuste de datos, no un caso
      // normal: sin esto desaparecía de la tabla y seguía en los sobres, y nadie lo veía.
      registrarFallo('[locale]/page', `No se pudo poner el plan «${plan.slug}» en la comparativa: se vende pero no está entre los planes activos`)
      return []
    }
    const limites = capacidadDePlan(fila)
    return [
      {
        nombre: plan.name,
        limites: config === null ? limites : { ...limites, asistente: tieneLuxury(limites, config) },
        destacado: plan.highlighted,
        precio: formatMoney(plan.price, locale),
        precioAntes: plan.priceBeforeCents !== null && plan.priceBeforeCents > plan.price.cents ? formatMoney({ cents: plan.priceBeforeCents, currency: plan.price.currency }, locale) : '',
      },
    ]
  })
  const comparacion = dictionary.pricing.comparison
  const textosComparativa = {
    ...comparacion,
    // Luxury solo se compara si se vende: sin clave de OpenAI, la fila sobra.
    filas: Object.fromEntries(Object.entries(comparacion.filas).filter(([clave]) => config !== null || clave !== 'luxury')) as typeof comparacion.filas,
  }

  // Las notas que la portada enseña, con el importe ya escrito: es lo que se marca para Google.
  const laReserva = Object.values(reservas).length === 0 ? '' : formatMoney({ cents: Math.min(...Object.values(reservas)), currency: plans[0]?.price.currency ?? 'BOB' }, locale)
  const notasParaGoogle = dictionary.portada.notas.items.map((nota) => ({ question: nota.pregunta, answer: nota.respuesta.replace('{reserva}', laReserva) }))

  // Los modelos del catálogo, en el orden que fijó el admin. La portada enseña los dos mundos.
  const disenos: DisenoDePortada[] = templates.map((t) => ({
    clave: t.slug,
    nombre: t.name,
    fiesta: t.categorySlug === 'xv-anos' ? 'xv' : 'boda',
    portada: t.coverImagePath,
  }))
  // El anillo **alterna boda y XV**, como la maqueta. Con el orden del admin tal cual salían las
  // once bodas seguidas y después los nueve XV: media vuelta del cilindro quedaba de un solo tono.
  // Dentro de cada mundo manda el orden del admin.
  const bodas = disenos.filter((d) => d.fiesta === 'boda')
  const quinces = disenos.filter((d) => d.fiesta === 'xv')
  const alternados: DisenoDePortada[] = []
  for (let i = 0; i < Math.max(bodas.length, quinces.length); i += 1) {
    const unaBoda = bodas[i]
    const unXv = quinces[i]
    if (unaBoda !== undefined) alternados.push(unaBoda)
    if (unXv !== undefined) alternados.push(unXv)
  }

  const preferidos = ABANICO.flatMap((clave) => disenos.filter((d) => d.clave === clave))
  const abanico = [...preferidos, ...disenos.filter((d) => !preferidos.includes(d))].slice(0, 9)

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            organizationJsonLd({
              whatsapp: sitio.whatsapp,
              direccion: sitio.direccion,
              ciudad: sitio.ciudad,
              pais: sitio.pais,
              redes: [sitio.redes.instagram, sitio.redes.facebook, sitio.redes.tiktok],
              correo: sitio.redes.correo ?? '',
            }),
          ),
        }}
        nonce={nonce}
        type="application/ld+json"
      />
      <script dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd(locale)) }} nonce={nonce} type="application/ld+json" />
      <script dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(plans, locale)) }} nonce={nonce} type="application/ld+json" />
      <script dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(dictionary, notasParaGoogle)) }} nonce={nonce} type="application/ld+json" />

      <Portada
        abanico={abanico}
        columnas={columnas}
        dictionary={dictionary}
        disenos={alternados}
        locale={locale}
        planes={plans}
        registrarConsulta={submitConsultationAction}
        reservas={reservas}
        textosComparativa={textosComparativa}
        whatsapp={sitio.whatsapp.replace(/\D/g, '')}
      />
    </>
  )
}
