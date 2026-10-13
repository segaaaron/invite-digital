'use client'

import { useActionState } from 'react'
import { deleteEventAction, type DeleteEventState } from '@/app/_acciones/events/actions'
import { ConfirmAction } from '@/shared/design/ui/panel/ConfirmAction'
import { botonClases } from '@/shared/design/ui/panel/PanelKit'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'

/**
 * Borrar el evento (maqueta E35 y su diálogo E65).
 *
 * Se lleva por delante invitados, mesas, regalos, mensajes, fotos y documentos, y no hay papelera. Por eso
 * el diálogo dice qué se pierde y no deja confirmar hasta escribir el nombre del evento — y el servidor lo
 * vuelve a comprobar, porque este formulario es cortesía y la acción es un extremo público.
 */
export function DangerZone({ eventId, titulo, personas }: { eventId: string; titulo: string; personas?: number }) {
  const [state, action] = useActionState<DeleteEventState, FormData>(sinCaerse(deleteEventAction), { status: 'idle' })

  return (
    <section aria-labelledby="borrar-evento" className="flex flex-col gap-3 rounded-[16px] border border-danger/30 bg-bg-raised p-5.5">
      <h2 className="text-[16px] font-medium text-danger" id="borrar-evento">
        Borrar el evento
      </h2>
      <p className="text-[14.5px] leading-[1.6] text-ink-mute">Se borran invitados, fotos y documentos. No se puede deshacer.</p>
      <div>
        <ConfirmAction
          action={action}
          aviso={
            <>
              Se borran {personas === undefined ? 'sus invitados' : personas === 1 ? '1 invitado' : `${personas} invitados`}, sus enlaces, las firmas, las fotos y los documentos. Los
              enlaces enviados dejarán de abrir.
            </>
          }
          confirmLabel="Borrar para siempre"
          description="No se puede deshacer."
          requiere={titulo}
          requiereEtiqueta="Para confirmar, escribe el nombre del evento"
          title="Borrar el evento"
          tone="danger"
          trigger="Borrar evento"
          volver="Ficha del evento"
          triggerClassName={botonClases('danger')}
        >
          <input name="eventId" type="hidden" value={eventId} />
        </ConfirmAction>
      </div>
      {state.status === 'error' ? (
        <p className="text-[13.5px] text-danger" role="alert">
          {state.message}
        </p>
      ) : null}
    </section>
  )
}
