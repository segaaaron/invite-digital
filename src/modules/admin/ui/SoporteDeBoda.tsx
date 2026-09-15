'use client'

import { useActionState, useId } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelAlert } from '@/shared/design/ui/panel/PanelKit'
import { enterAsClientAction, resetClientAccessAction, type SupportState } from '@/app/_acciones/admin/support-actions'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'

const INICIAL: SupportState = { status: 'idle' }

export type Anfitrion = { readonly userId: string; readonly email: string }

/**
 * Soporte de una boda desde la cartera. El admin no entra a los datos del cliente: o entra
 * **como el cliente** —con motivo, aviso por correo y registro— o le restablece el acceso. Sin
 * anfitrión no hay a quién ayudar, y lo dice.
 */
export function SoporteDeBoda({ eventId, anfitriones }: { eventId: string; anfitriones: readonly Anfitrion[] }) {
  const id = useId()
  const [entrada, entrar, entrando] = useActionState(enterAsClientAction, INICIAL)
  const [reinicio, restablecer, restableciendo] = useActionState(resetClientAccessAction, INICIAL)

  if (anfitriones.length === 0) {
    return <p className="text-[12px] text-ink-mute">Sin anfitrión todavía: da el acceso del cliente para poder darle soporte.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <form action={entrar} className="flex flex-wrap items-end gap-2">
        <input name="eventId" type="hidden" value={eventId} />
        <span className="flex flex-col gap-1.5">
          <label className={LABEL_CLASS} htmlFor={`${id}-anfitrion`}>
            Como
          </label>
          <select className={`${FIELD_CLASS} py-2`} id={`${id}-anfitrion`} name="clientUserId">
            {anfitriones.map((a) => (
              <option key={a.userId} value={a.userId}>
                {a.email}
              </option>
            ))}
          </select>
        </span>
        <span className="flex min-w-[16rem] flex-1 flex-col gap-1.5">
          <label className={LABEL_CLASS} htmlFor={`${id}-motivo`}>
            Motivo (se le envía al cliente)
          </label>
          <input className={`${FIELD_CLASS} py-2`} id={`${id}-motivo`} maxLength={500} minLength={10} name="motivo" placeholder="La lista de invitados no carga" required type="text" />
        </span>
        <SubmitButton variant="primary" pending={entrando} pendingLabel={'Entrando…'}>{'Entrar como el cliente'}</SubmitButton>
      </form>
      <ActionFeedback errorsOnly state={entrada} />

      <form action={restablecer} className="flex flex-wrap items-end gap-2">
        <input name="eventId" type="hidden" value={eventId} />
        <span className="flex flex-col gap-1.5">
          <label className={LABEL_CLASS} htmlFor={`${id}-reset`}>
            Restablecer acceso de
          </label>
          <select className={`${FIELD_CLASS} py-2`} id={`${id}-reset`} name="clientUserId">
            {anfitriones.map((a) => (
              <option key={a.userId} value={a.userId}>
                {a.email}
              </option>
            ))}
          </select>
        </span>
        <SubmitButton variant="default" pending={restableciendo} pendingLabel={'Restableciendo…'}>{'Restablecer acceso'}</SubmitButton>
      </form>
      <ActionFeedback errorsOnly state={reinicio} />
      {reinicio.status === 'success' ? (
        <PanelAlert tone="ok">
          {reinicio.message}
          {reinicio.password === undefined ? null : (
            <>
              {' '}
              <code className="font-mono">{reinicio.password}</code>
            </>
          )}
        </PanelAlert>
      ) : null}
    </div>
  )
}
