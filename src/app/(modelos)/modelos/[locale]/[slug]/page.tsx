import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { webPublica } from '@/app/composition/container'
import type { Event } from '@/modules/events/domain/event'
import { fechasDeMuestra, fiestaDeTema } from '@/modules/events'
import { fechaEnBolivia } from '@/shared/format/fecha'
import { PhonePreview } from '@/modules/events/ui/themes/kit/PhonePreview'
import { EstiloDeLaInvitacion } from '@/modules/events/ui/EstiloDeLaInvitacion'
import { leerEstilo, SIN_ESTILO } from '@/modules/events/domain/estilo'
import { INVITADO_DE_MUESTRA, ranurasDeVistaPrevia } from '@/modules/events/ui/themes/kit/preview-slots'
import { THEME_KEYS, themeFor } from '@/modules/events/ui/themes/registry'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import { isOk } from '@/shared/result'
import { nombreDelCatalogo, seVende } from '@/shared/design/theme-catalog'
import { buildPageMetadata } from '@/shared/seo/metadata'

/**
 * La vista previa de un modelo: **el diseño entero**, no una tarjeta.
 *
 * Es lo que convierte el catálogo en escaparate. Hasta ahora la web vendía ocho modelos
 * dibujados como una tarjeta de papel que no se parecían a nada de lo que el invitado
 * acababa recibiendo.
 *
 * El evento es de muestra y se arma aquí, no sale de la base: esto es un escaparate, no un
 * evento. El contenido es el `defaultContent` del propio tema, que es el de la maqueta.
 *
 * Las ranuras van **inertes**, con su aviso. Un formulario de muestra que parece funcionar
 * y no guarda nada es peor que no tenerlo.
 *
 * Y se enseña **dentro de un teléfono**, como la maqueta: estos diseños están dibujados
 * para esa pantalla, y a lo ancho de un portátil el fondo se derrama por los lados y lo
 * que se ve deja de ser el modelo.
 */
export const dynamic = 'force-dynamic'

export function generateStaticParams(): { slug: string }[] {
  return THEME_KEYS.filter((clave) => clave !== 'clasico').map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale: crudo, slug } = await params
  const locale = parseLocaleParam(crudo)
  if (locale === null) return {}

  const tema = themeFor(slug)
  if (tema.key !== slug) return {}

  const diccionario = getDictionary(locale)
  const fiesta = diccionario.seo.fiestaDeModelo[fiestaDeTema(tema.key)]
  const metadatos = buildPageMetadata({
    locale,
    path: `/modelos/${locale}/${slug}`,
    // Título y descripción propios de cada modelo: con los del catálogo, los veinte competían entre sí en Google.
    title: diccionario.seo.modelTitle.replace('{nombre}', nombreDelCatalogo(tema.key, locale) ?? tema.label).replace('{fiesta}', fiesta),
    description: diccionario.seo.modelDescription.replace('{nombre}', nombreDelCatalogo(tema.key, locale) ?? tema.label).replace('{fiesta}', fiesta),
  })
  // Un modelo que todavía no se vende no se indexa: la dirección existe porque el panel
  // enlaza a ella para verlo, y el catálogo no lo enseña.
  return seVende(slug) ? metadatos : { ...metadatos, robots: { index: false, follow: false } }
}

export default async function ModelPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale: crudo, slug } = await params
  const locale = parseLocaleParam(crudo)
  if (locale === null) notFound()

  const tema = themeFor(slug)
  // `themeFor` cae al clásico con una clave desconocida, que es lo correcto para una
  // invitación de verdad —mejor sobria que en blanco— y lo incorrecto aquí: un modelo que
  // no existe es un 404, no otro tema con el nombre cambiado.
  if (tema.key !== slug || slug === 'clasico') notFound()

  const diccionario = getDictionary(locale)
  const { Component: Tema } = tema
  // El modelo con otro acento o letra (`?acento=%237a2335&caligrafia=allura`): lo mismo que
  // Gala deja elegir, y solo eso (`leerEstilo`). Cualquier otro valor, el del diseño.
  const consulta = await searchParams
  const texto = (k: string) => (typeof consulta[k] === 'string' ? consulta[k] : '')
  const estilo =
    leerEstilo(
      // Lo que el diseño no admite se ignora (el escaparate no es un formulario).
      { acento: texto('acento'), caligrafia: tema.estilo?.caligrafia ? texto('caligrafia') : '', titulares: tema.estilo?.titulares ? texto('titulares') : '' },
      { acento: tema.estilo?.acento ?? null, caligrafia: tema.estilo?.caligrafia !== undefined, titulares: tema.estilo?.titulares !== undefined },
    ) ?? SIN_ESTILO

  /**
   * Si este modelo tiene canción, de las que el admin sube en la administración.
   *
   * **Si la base no responde, el modelo se enseña mudo y no roto.** Un escaparate que
   * devuelve un error porque no pudo averiguar si había música sería cambiar una canción
   * por una página en blanco, y lo que se viene a ver aquí es el diseño.
   */
  const [musica, cancionesLeidas] = await Promise.all([
    webPublica.musicaDeModelos().catch(() => null),
    webPublica.cancionesDeModelos().catch(() => null),
  ])
  const cancion = cancionesLeidas?.ok ? cancionesLeidas.value[slug] : undefined
  const tieneMusica = musica !== null && isOk(musica) && (musica.value[slug] ?? '') !== ''
  // Con canción subida, el reproductor dice la que suena y no la del contenido de muestra.
  // Una subida anterior a guardar el nombre no lo tiene: sin él se deja en blanco, que es
  // mejor que anunciar a Chayanne sonando otra cosa.
  // Fechas siempre por delante de hoy: con las fijas del modelo, la cuenta regresiva quedaba en cero.
  const fechas = fechasDeMuestra(fechaEnBolivia(new Date()), tema.defaultContent.schedule?.startsAt)
  const base = { ...tema.defaultContent, schedule: { startsAt: fechas.startsAt } }
  const contenido = tieneMusica
    ? { ...base, music: { ...base.music, track: cancion?.track ?? '', artist: cancion?.artist ?? '' } }
    : base

  const eventoDeMuestra: Event = {
    id: 'muestra',
    userId: null,
    slug,
    title: tema.label,
    eventDate: fechas.eventDate,
    rsvpDeadline: fechas.rsvpDeadline,
    locale,
    themeKey: slug,
    status: 'live',
    retentionDays: 90,
    currency: 'BOB',
    messageTemplate: null,
    venue: null,
  }

  return (
    <PhonePreview
      // Lo que cierra el círculo: de mirar el modelo a pedirlo, llevándose la clave del
      // diseño hasta el pedido. Antes el escaparate y la compra eran dos caminos que no
      // se tocaban, y quien aprobaba no sabía qué modelo había mirado el cliente.
      action={{ href: `/${locale}?modelo=${encodeURIComponent(slug)}#precios`, label: diccionario.themes.chooseDesign }}
      exit={{ href: `/${locale}/colecciones#modelos`, label: diccionario.themes.previewClose }}
    >
      <EstiloDeLaInvitacion estilo={estilo} tema={tema}>
      <Tema
        // La canción de **este modelo**, la que el admin subió desde la administración.
        // No sale del contenido —el de muestra no tiene archivo detrás— porque no es de
        // ninguna boda: es de la web pública. Sin ella, el reproductor se queda como
        // nació: se ve, mueve las barras y no suena.
        audioSrc={tieneMusica ? `/modelos/musica/${slug}` : undefined}
        content={contenido}
        dictionary={diccionario.invitation}
        event={eventoDeMuestra}
        guestInfo={INVITADO_DE_MUESTRA}
        slots={ranurasDeVistaPrevia(diccionario, tema.rsvp)}
        themes={diccionario.themes}
      />
      </EstiloDeLaInvitacion>
    </PhonePreview>
  )
}
