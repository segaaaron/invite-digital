import Link from 'next/link'
import { notFound } from 'next/navigation'
import { events } from '@/app/composition/container'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { requireSession } from '@/modules/identity/session-cookie'
import { themeFonts } from '@/shared/design/fonts'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { isErr } from '@/shared/result'
import '@/modules/events/ui/themes/kit/keyframes.css'

export const metadata = { title: 'Vista previa' }

// Lo que se enseña es el contenido de este evento, que cambia con cada bloque guardado.
export const dynamic = 'force-dynamic'

/**
 * La invitación **de esta boda**, vista desde el panel y sin repartir un enlace.
 *
 * `/modelos/<idioma>/<clave>` enseña el diseño con el contenido de muestra: sirve para
 * elegirlo, no para revisar lo que se ha escrito. Y la invitación de verdad vive detrás
 * del token de un grupo, así que hasta ahora la única forma de ver la boda terminada era
 * darse de alta como invitado o abrir el enlace de alguien —que además cuenta como visita
 * suya en la analítica—.
 *
 * Es una pantalla sin carcasa, como el modo puerta y el plan del banquete: con la barra
 * lateral al lado, lo que se ve no es la invitación. Las tipografías del tema van en un
 * `div` y no en el `<html>` —que lo emite el layout del panel— porque son variables CSS y
 * heredan igual.
 *
 * Las ranuras van **inertes**, con su aviso, por el mismo motivo que en el escaparate: un
 * formulario que parece funcionar y no guarda nada es peor que no tenerlo. El RSVP, la
 * mesa de regalos y el pase son de un grupo concreto, y aquí no hay ninguno.
 */
export default async function VistaPreviaPage({ params }: { params: Promise<{ slug: string }> }) {
  const actor = await requireSession()
  const { slug } = await params

  const event = await events.getFor(actor, slug)
  if (isErr(event)) {
    if (event.error.kind === 'not_found') notFound()
    throw new Error(event.error.detail)
  }

  const definicion = themeFor(event.value.themeKey)
  const { Component: Tema } = definicion

  // El mismo contenido y la misma caída que la página del invitado: sin fila sembrada, la
  // muestra del diseño. Si aquí se viera otra cosa, esta pantalla no serviría para nada.
  const contenido = await events.contentFor(event.value.id, definicion.defaultContent)

  const diccionario = getDictionary(event.value.locale)
  const inerte = <p style={{ fontSize: 12, lineHeight: 1.7, opacity: 0.6 }}>{diccionario.themes.previewNotice}</p>
  const variables = definicion.fonts.map((clave) => themeFonts[clave].variable).join(' ')

  return (
    <div className={variables}>
      {/* La salida. Sin ella se sale con el botón de atrás del navegador, que en una
          pantalla sin carcasa es adivinar. Va por encima del diseño y con la piel del
          panel: es nuestra, no de la invitación. */}
      <Link
        className="fixed top-4 left-4 z-50 rounded-[var(--radius-pill)] border border-line-panel-strong bg-white px-4 py-2 font-mono text-[10px] tracking-[0.25em] text-ink uppercase shadow-[var(--shadow-card)]"
        href={`/panel/eventos/${event.value.slug}/configuracion`}
      >
        Volver al panel
      </Link>

      <Tema
        content={contenido}
        dictionary={diccionario.invitation}
        event={event.value}
        preview
        slots={{ guest: inerte, rsvp: inerte, registry: inerte, guestbook: inerte, pass: null }}
        themes={diccionario.themes}
      />
    </div>
  )
}
