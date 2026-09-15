import { notFound } from 'next/navigation'
import { events } from '@/app/composition/container'
import { PhonePreview } from '@/modules/events/ui/themes/kit/PhonePreview'
import { INVITADO_DE_MUESTRA, ranurasDeVistaPrevia } from '@/modules/events/ui/themes/kit/preview-slots'
import { themeFor } from '@/modules/events/ui/themes/registry'
import { requireSession } from '@/app/_acciones/sesion'
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

  const event = await events.getFor(actor, slug, { section: 'vistaPrevia' })
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
  const variables = definicion.fonts.map((clave) => themeFonts[clave].variable).join(' ')

  return (
    <div className={variables}>
      {/* Dentro de un teléfono, como el escaparate y como la maqueta: es la pantalla para
          la que están dibujados, y a lo ancho el fondo se derrama por los lados. */}
      <PhonePreview
        exit={{ href: `/panel/eventos/${event.value.slug}/configuracion`, label: 'Volver al panel' }}
      >
        <Tema
          content={contenido}
          dictionary={diccionario.invitation}
          event={event.value}
          guestInfo={INVITADO_DE_MUESTRA}
          slots={ranurasDeVistaPrevia(diccionario, definicion.rsvp)}
          themes={diccionario.themes}
        />
      </PhonePreview>
    </div>
  )
}
