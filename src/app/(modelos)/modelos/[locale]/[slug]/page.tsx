import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { admin } from '@/app/composition/container'
import type { Event } from '@/modules/events/domain/event'
import { PhonePreview } from '@/modules/events/ui/themes/kit/PhonePreview'
import { INVITADO_DE_MUESTRA, ranurasDeVistaPrevia } from '@/modules/events/ui/themes/kit/preview-slots'
import { THEME_KEYS, themeFor } from '@/modules/events/ui/themes/registry'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
import { isOk } from '@/shared/result'
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
  return buildPageMetadata({
    locale,
    path: `/modelos/${locale}/${slug}`,
    title: `${tema.label} · ${diccionario.seo.collectionsTitle}`,
    description: diccionario.seo.collectionsDescription,
  })
}

export default async function ModelPreviewPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
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

  /**
   * Si este modelo tiene canción, de las que el admin sube en la administración.
   *
   * **Si la base no responde, el modelo se enseña mudo y no roto.** Un escaparate que
   * devuelve un error porque no pudo averiguar si había música sería cambiar una canción
   * por una página en blanco, y lo que se viene a ver aquí es el diseño.
   */
  const [musica, canciones] = await Promise.all([admin.showcaseMusic(), admin.showcaseSongs()])
  const cancion = canciones[slug]
  const tieneMusica = isOk(musica) && (musica.value[slug] ?? '') !== ''
  // Con canción subida, el reproductor dice la que suena y no la del contenido de muestra.
  // Una subida anterior a guardar el nombre no lo tiene: sin él se deja en blanco, que es
  // mejor que anunciar a Chayanne sonando otra cosa.
  const contenido = tieneMusica
    ? { ...tema.defaultContent, music: { ...tema.defaultContent.music, track: cancion?.track ?? '', artist: cancion?.artist ?? '' } }
    : tema.defaultContent

  const eventoDeMuestra: Event = {
    id: 'muestra',
    userId: null,
    slug,
    title: tema.label,
    eventDate: '2026-11-14',
    rsvpDeadline: '2026-10-30',
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
      action={{ href: `/${locale}?modelo=${encodeURIComponent(slug)}#precios`, label: 'Elegir este diseño' }}
      exit={{ href: `/${locale}/colecciones#modelos`, label: diccionario.themes.previewClose }}
    >
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
    </PhonePreview>
  )
}
