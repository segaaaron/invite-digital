'use client'

import { useActionState } from 'react'
import { borrarDemoAction, type DemoActionState } from '@/app/_acciones/admin/demos-actions'
import { ConfirmAction } from '@/shared/design/ui/panel/ConfirmAction'
import { useT } from '@/shared/i18n/idioma-navegador'

/**
 * Tirar una demo antes de que venza. Se confirma: borra la invitación, lo que el cliente escribió y las
 * fotos, y no hay papelera. No pide escribir el nombre —como sí hace borrar una boda— porque esto es un
 * borrador de un día que de todos modos muere esta noche.
 */
export function BorrarDemo({ eventId, titulo }: { eventId: string; titulo: string }) {
  const t = useT()
  const [estado, enviar] = useActionState<DemoActionState, FormData>(borrarDemoAction, { status: 'idle' })

  return (
    <span className="inline-flex items-center gap-3">
      {estado.status === 'error' ? (
        <span className="text-[12px] text-danger-deep" role="alert">
          {estado.message}
        </span>
      ) : null}
      <ConfirmAction
        action={enviar}
        confirmLabel={t('Borrar la demo', 'Delete the demo')}
        description={t(
          `Se va «${titulo}» con su enlace: si el cliente la abre después, ya no verá nada.`,
          `“${titulo}” goes, link included: if the client opens it afterwards, they’ll see nothing.`,
        )}
        title={t('Borrar esta demo', 'Delete this demo')}
        tone="danger"
        trigger={t('Borrar', 'Delete')}
        triggerClassName="cursor-pointer text-[13px] text-danger-deep underline-offset-4 hover:underline"
      >
        <input name="eventId" type="hidden" value={eventId} />
      </ConfirmAction>
    </span>
  )
}
