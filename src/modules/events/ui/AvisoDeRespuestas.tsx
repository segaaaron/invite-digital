'use client'

import { useActionState } from 'react'
import { setAvisoDeRespuestasAction, type AvisoDeRespuestasState } from '@/app/_acciones/events/actions'
import { SwitchRow } from '@/shared/design/ui/panel/ajustes'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'

const INICIAL: AvisoDeRespuestasState = { status: 'idle' }

/** El correo a los anfitriones con cada respuesta: «Ana confirmó · 3 personas». */
export function AvisoDeRespuestas({ eventId, eventSlug, avisar }: { eventId: string; eventSlug: string; avisar: boolean }) {
  const [estado, guardar, guardando] = useActionState(setAvisoDeRespuestasAction, INICIAL)
  return (
    <form action={guardar} className="flex flex-col gap-3">
      <input name="eventId" type="hidden" value={eventId} />
      <input name="eventSlug" type="hidden" value={eventSlug} />
      <SwitchRow
        defaultChecked={avisar}
        description="Te llega un correo cada vez que un invitado confirma o dice que no podrá ir, con su mensaje si dejó uno."
        label="Avisarme por correo de cada respuesta"
        name="avisar"
      />
      <ActionFeedback state={estado} />
      <SubmitButton className="w-fit" pending={guardando} pendingLabel="Guardando…">
        Guardar
      </SubmitButton>
    </form>
  )
}
