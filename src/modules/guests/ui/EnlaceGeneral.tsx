'use client'

import { useActionState } from 'react'
import { crearEnlaceGeneralAction, quitarEnlaceGeneralAction, type EnlaceGeneralState } from '@/app/_acciones/guests/enlace-general-actions'
import { CopyLinkButton } from '@/shared/design/ui/CopyLinkButton'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

const INICIAL: EnlaceGeneralState = { status: 'idle', message: '' }

/**
 * El enlace general del evento: uno para compartir en un grupo de WhatsApp. Quien lo abre escribe
 * su nombre y quiénes van, y recibe su invitación personal (cuenta en el tope del plan).
 */
export function EnlaceGeneral({ eventId, eventSlug, url }: { eventId: string; eventSlug: string; url: string | null }) {
  const [creado, crear] = useActionState(sinCaerse(crearEnlaceGeneralAction), INICIAL)
  const [quitado, quitar] = useActionState(sinCaerse(quitarEnlaceGeneralAction), INICIAL)
  // Lo vigente lo dice el servidor (la acción revalida): con el estado local, «Quitar» seguía enseñando el enlace.
  const vigente = url
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-ink-soft">
        Para no cargar a cada invitado: un solo enlace para el grupo de la familia. Quien lo abre escribe su nombre y quiénes van con él, y recibe su invitación con su pase. Aparece aquí, en tu lista.
      </p>
      {vigente === null ? null : (
        <div className="flex flex-wrap items-center gap-2">
          <code className="max-w-full truncate rounded-[10px] border border-line-panel bg-white px-3 py-2 text-[12px] text-ink">{vigente}</code>
          <CopyLinkButton url={vigente} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <form action={crear}>
          <input name="eventId" type="hidden" value={eventId} />
          <input name="eventSlug" type="hidden" value={eventSlug} />
          <SubmitButton variant={vigente === null ? 'primary' : 'default'}>{vigente === null ? 'Crear enlace general' : 'Cambiar el enlace'}</SubmitButton>
        </form>
        {vigente === null ? null : (
          <form action={quitar}>
            <input name="eventId" type="hidden" value={eventId} />
            <input name="eventSlug" type="hidden" value={eventSlug} />
            <SubmitButton variant="default">Quitar</SubmitButton>
          </form>
        )}
      </div>
      <ActionFeedback state={creado} />
      <ActionFeedback state={quitado} />
    </div>
  )
}
