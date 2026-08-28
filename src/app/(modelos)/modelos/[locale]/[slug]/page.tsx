import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { Event } from '@/modules/events/domain/event'
import { PhonePreview } from '@/modules/events/ui/themes/kit/PhonePreview'
import { THEME_KEYS, themeFor } from '@/modules/events/ui/themes/registry'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { parseLocaleParam } from '@/shared/i18n/server'
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

  const inerte = <p style={{ fontSize: 12, lineHeight: 1.7, opacity: 0.6 }}>{diccionario.themes.previewNotice}</p>

  return (
    <PhonePreview>
      <Tema
        content={tema.defaultContent}
        dictionary={diccionario.invitation}
        event={eventoDeMuestra}
        preview
        slots={{ guest: inerte, rsvp: inerte, registry: inerte, guestbook: inerte, pass: null }}
        themes={diccionario.themes}
      />
    </PhonePreview>
  )
}
