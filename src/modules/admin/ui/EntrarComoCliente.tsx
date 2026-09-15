'use client'

import { useActionState, useId, useRef } from 'react'
import { botonClases, FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { enterAsClientAction, type SupportState } from '@/app/_acciones/admin/support-actions'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import type { Anfitrion } from './SoporteDeBoda'

const INICIAL: SupportState = { status: 'idle' }

/**
 * «Entrar como el cliente», a la vista: un botón en la fila de la cartera y en la ficha del
 * evento que abre un `<dialog>` con el motivo. Estuvo plegado dentro de «Gestionar» y no lo
 * encontraba nadie. Entrar sigue exigiendo motivo, avisa al cliente y queda registrado.
 */
export function EntrarComoCliente({ eventId, anfitriones, variant = 'default' }: { eventId: string; anfitriones: readonly Anfitrion[]; variant?: 'default' | 'primary' }) {
  const [estado, entrar, entrando] = useActionState(enterAsClientAction, INICIAL)
  const dialogo = useRef<HTMLDialogElement>(null)
  const id = useId()

  if (anfitriones.length === 0) return null

  return (
    <>
      <button aria-haspopup="dialog" className={botonClases(variant)} onClick={() => dialogo.current?.showModal()} type="button">
        Entrar como el cliente
      </button>
      <dialog
        aria-labelledby={`${id}-titulo`}
        className="m-auto w-[min(480px,92vw)] rounded-[18px] border border-line-panel bg-bg-raised p-6 text-left text-ink shadow-float backdrop:bg-ink/45"
        ref={dialogo}
      >
        <h2 className="font-display text-[22px] leading-tight" id={`${id}-titulo`}>
          Entrar como el cliente
        </h2>
        <p className="mt-2 text-[13.5px] leading-[1.6] text-ink-soft">
          Verás su panel tal como lo ve: invitados, envíos, mesas y planner. Le avisamos por correo con el motivo, y lo que cambies queda
          registrado a tu nombre. Para salir, «Regresar al panel de admin».
        </p>
        <form action={entrar} className="mt-5 flex flex-col gap-4">
          <input name="eventId" type="hidden" value={eventId} />
          {anfitriones.length === 1 ? (
            <input name="clientUserId" type="hidden" value={anfitriones[0]?.userId} />
          ) : (
            <span className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS} htmlFor={`${id}-anfitrion`}>
                Como
              </label>
              <select className={FIELD_CLASS} id={`${id}-anfitrion`} name="clientUserId">
                {anfitriones.map((a) => (
                  <option key={a.userId} value={a.userId}>
                    {a.email}
                  </option>
                ))}
              </select>
            </span>
          )}
          {anfitriones.length === 1 ? <p className="text-[13px] text-ink">Entrarás como {anfitriones[0]?.email}</p> : null}
          <span className="flex flex-col gap-1.5">
            <label className={LABEL_CLASS} htmlFor={`${id}-motivo`}>
              Motivo (se le envía al cliente)
            </label>
            <input
              aria-describedby={`${id}-motivo-ayuda`}
              className={FIELD_CLASS}
              id={`${id}-motivo`}
              maxLength={500}
              minLength={10}
              name="motivo"
              required
              type="text"
            />
            <span className="text-[12px] text-ink-mute" id={`${id}-motivo-ayuda`}>
              Por ejemplo: «Revisar por qué no carga la lista de invitados».
            </span>
          </span>
          <ActionFeedback errorsOnly state={estado} />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              className="rounded-[var(--radius-pill)] border border-line-panel-strong bg-white px-5 py-2.5 text-[13px] text-ink transition-colors hover:border-ink"
              onClick={() => dialogo.current?.close()}
              type="button"
            >
              Cancelar
            </button>
            <SubmitButton pending={entrando} pendingLabel="Entrando…" variant="primary">
              Entrar
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  )
}
