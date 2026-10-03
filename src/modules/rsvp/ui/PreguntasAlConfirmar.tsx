'use client'

import { useActionState, useId } from 'react'
import { guardarPreguntasAction, type PreguntasState } from '@/app/_acciones/rsvp/preguntas-actions'
import { FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import type { PreguntasDelRsvp } from '../domain/preguntas'

/**
 * Qué se pregunta al confirmar, además de si viene: la canción que no puede faltar, el menú y a
 * qué actos va (civil, iglesia, fiesta). Vacío, el formulario de siempre.
 */
export function PreguntasAlConfirmar({ eventId, eventSlug, preguntas }: { eventId: string; eventSlug: string; preguntas: PreguntasDelRsvp }) {
  const [estado, accion] = useActionState<PreguntasState, FormData>(sinCaerse(guardarPreguntasAction), { status: 'idle', message: '' })
  const id = useId()
  return (
    <form action={accion} className="flex flex-col gap-4">
      <input name="eventId" type="hidden" value={eventId} />
      <input name="eventSlug" type="hidden" value={eventSlug} />
      <label className="flex items-center gap-2.5 text-[13.5px] text-ink">
        <input className="accent-ink" defaultChecked={preguntas.cancion} name="cancion" type="checkbox" />
        Pedir una canción que no puede faltar
      </label>
      <div className="grid gap-4 min-[700px]:grid-cols-2">
        <label className="flex flex-col gap-2" htmlFor={`${id}-menus`}>
          <span className={LABEL_CLASS}>Menús para elegir · uno por línea</span>
          <textarea className={`${FIELD_CLASS} min-h-[96px]`} defaultValue={preguntas.menus.join('\n')} id={`${id}-menus`} name="menus" placeholder={'Carne\nPollo\nVegetariano'} />
        </label>
        <label className="flex flex-col gap-2" htmlFor={`${id}-actos`}>
          <span className={LABEL_CLASS}>Actos · uno por línea</span>
          <textarea className={`${FIELD_CLASS} min-h-[96px]`} defaultValue={preguntas.actos.join('\n')} id={`${id}-actos`} name="actos" placeholder={'Civil\nIglesia\nFiesta'} />
        </label>
      </div>
      <p className="text-[12px] text-ink-mute">Hasta 6 menús y 4 actos. Los actos no cambian el recuento para las mesas y la puerta: ese es el de la fiesta.</p>
      <ActionFeedback state={estado} />
      <div>
        <SubmitButton>Guardar preguntas</SubmitButton>
      </div>
    </form>
  )
}
