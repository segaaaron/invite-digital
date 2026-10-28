import { notFound } from 'next/navigation'
import { events } from '@/app/composition/container'
import { VistaPreviaDelPanel } from '@/modules/events/ui/VistaPreviaDelPanel'
import { INVITADO_DE_MUESTRA, ranurasDeVistaPrevia } from '@/modules/events/ui/themes/kit/preview-slots'
import { muestraDe, themeFor } from '@/modules/events/ui/themes/registry'
import { requireSession } from '@/app/_acciones/sesion'
import { esDemo } from '@/modules/events'
import { themeFonts } from '@/shared/design/fonts'
import { EstiloDeLaInvitacion } from '@/modules/events/ui/EstiloDeLaInvitacion'
import { getDictionary } from '@/shared/i18n/dictionaries'
import { isErr } from '@/shared/result'
import '@/modules/events/ui/themes/kit/keyframes.css'
import { tr } from '@/shared/i18n/idioma-servidor'

export async function generateMetadata() {
  const t = await tr()
  return { title: t('Vista previa', 'Preview') }
}

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
  // Como en el editor: lo escrito, y el ejemplo del modelo en lo que todavía está en blanco.
  const contenido = await events.contenidoParaVistaPrevia(event.value.id, muestraDe(definicion, event.value.locale), event.value.eventDate)

  const diccionario = getDictionary(event.value.locale)
  const variables = definicion.fonts.map((clave) => themeFonts[clave].variable).join(' ')

  return (
    <VistaPreviaDelPanel
      // La cinta de la demo se enseña también aquí: el admin tiene que ver **lo mismo** que le va a
      // llegar al cliente, y antes solo salía abriendo el enlace de verdad.
      demo={esDemo(event.value) ? { textos: diccionario.invitation.demo, href: `/${event.value.locale}#planes` } : null}
      fuentes={variables}
      volver={`/dashboard/events/${event.value.slug}/setup`}
    >
      <EstiloDeLaInvitacion estilo={await events.estilo.leer(event.value.id)} tema={definicion}>
        <Tema
          content={contenido}
          dictionary={diccionario.invitation}
          event={event.value}
          guestInfo={INVITADO_DE_MUESTRA}
          slots={ranurasDeVistaPrevia(diccionario, definicion.rsvp, definicion.categorySlug === 'xv-anos')}
          themes={diccionario.themes}
        />
      </EstiloDeLaInvitacion>
    </VistaPreviaDelPanel>
  )
}
