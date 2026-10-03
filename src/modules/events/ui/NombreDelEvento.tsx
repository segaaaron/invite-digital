'use client'

import { useActionState, useId } from 'react'
import { renombrarEventoAction, type RenombrarState } from '@/app/_acciones/events/actions'
import { FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

/**
 * El nombre del evento en el panel. El que nace de un pedido se llama como quien compró: aquí el
 * cliente lo cambia por el de la fiesta. No toca el enlace, el diseño ni la fecha.
 */
export function NombreDelEvento({ eventId, title }: { eventId: string; title: string }) {
  const [estado, accion, pendiente] = useActionState<RenombrarState, FormData>(sinCaerse(renombrarEventoAction), { status: 'idle', message: '' })
  const id = useId()

  return (
    <form action={accion} className="flex flex-col gap-3">
      <input name="eventId" type="hidden" value={eventId} />
      <label className="flex flex-col gap-2" htmlFor={id}>
        <span className={LABEL_CLASS}>Cómo se llama en tu panel</span>
        <input className={FIELD_CLASS} defaultValue={title} id={id} maxLength={160} name="title" placeholder="XV de Amanda" required type="text" />
        <span className="text-[11px] text-ink-mute">Solo lo ves tú y tu equipo. Tus invitados ven los nombres de la portada.</span>
      </label>
      <ActionFeedback state={estado} />
      <div>
        <SubmitButton pending={pendiente}>Guardar nombre</SubmitButton>
      </div>
    </form>
  )
}
