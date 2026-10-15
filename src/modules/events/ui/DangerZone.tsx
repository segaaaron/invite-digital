'use client'

import { useActionState } from 'react'
import { deleteEventAction, type DeleteEventState } from '@/app/_acciones/events/actions'
import { ConfirmAction } from '@/shared/design/ui/panel/ConfirmAction'
import { botonClases } from '@/shared/design/ui/panel/PanelKit'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * Borrar el evento (maqueta E35 y su diálogo E65).
 *
 * Se lleva por delante invitados, mesas, regalos, mensajes, fotos y documentos, y no hay papelera. Por eso
 * el diálogo dice qué se pierde y no deja confirmar hasta escribir el nombre del evento — y el servidor lo
 * vuelve a comprobar, porque este formulario es cortesía y la acción es un extremo público.
 */
export function DangerZone({ eventId, titulo, personas }: { eventId: string; titulo: string; personas?: number }) {
  const t = useT()
  const [state, action] = useActionState<DeleteEventState, FormData>(sinCaerse(deleteEventAction), { status: 'idle' })

  return (
    <section aria-labelledby="borrar-evento" className="flex flex-col gap-3 rounded-[16px] border border-danger/30 bg-bg-raised p-5.5">
      <h2 className="text-[16px] font-medium text-danger" id="borrar-evento">
        {t('Borrar el evento', 'Delete the event')}
      </h2>
      <p className="text-[14.5px] leading-[1.6] text-ink-mute">{t('Se borran invitados, fotos y documentos. No se puede deshacer.', 'Guests, photos and documents are deleted. This can’t be undone.')}</p>
      <div>
        <ConfirmAction
          action={action}
          aviso={
            <>
              {t(`Se borran ${personas === undefined ? 'sus invitados' : personas === 1 ? '1 invitado' : `${personas} invitados`}, sus enlaces, las firmas, las fotos y los documentos. Los enlaces enviados dejarán de abrir.`, `${personas === undefined ? 'Its guests' : personas === 1 ? '1 guest' : `${personas} guests`}, their links, the guestbook, the photos and the documents are deleted. Links already sent will stop opening.`)}
            </>
          }
          confirmLabel={t('Borrar para siempre', 'Delete forever')}
          description={t('No se puede deshacer.', 'This can’t be undone.')}
          requiere={titulo}
          requiereEtiqueta={t('Para confirmar, escribe el nombre del evento', 'To confirm, type the event name')}
          title={t('Borrar el evento', 'Delete the event')}
          tone="danger"
          trigger={t('Borrar evento', 'Delete event')}
          volver={t('Ficha del evento', 'Event record')}
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
