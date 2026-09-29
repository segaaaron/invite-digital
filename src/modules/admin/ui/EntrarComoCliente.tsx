'use client'

import { useId, useRef, useState, useTransition } from 'react'
import { botonClases } from '@/shared/design/ui/panel/PanelKit'
import { enterAsClientAction } from '@/app/_acciones/admin/support-actions'
import type { Anfitrion } from './SoporteDeBoda'

/**
 * «Entrar como el cliente», **de un clic** (28 de septiembre: antes pedía un motivo que se repetía y
 * acababa en 404). Con un anfitrión entra directo; con varios, un diálogo para elegir como quién. Cada
 * entrada queda en la auditoría. La navegación la hace el navegador (`location.assign`): una petición
 * nueva, ya con la sesión en modo soporte.
 */
export function EntrarComoCliente({
  eventId,
  anfitriones,
  variant = 'default',
  claseDelBoton,
}: {
  eventId: string
  anfitriones: readonly Anfitrion[]
  variant?: 'default' | 'primary'
  /** Para pintarlo como una opción de un menú «⋯» en vez de como botón. */
  claseDelBoton?: string
}) {
  const [entrando, empezar] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const dialogo = useRef<HTMLDialogElement>(null)
  const id = useId()

  if (anfitriones.length === 0) return null

  const entrarComo = (clientUserId: string) =>
    empezar(async () => {
      setError(null)
      const hecho = await enterAsClientAction({ eventId, clientUserId })
      if (hecho.status === 'ok') window.location.assign(hecho.href)
      else setError(hecho.message)
    })

  return (
    <>
      <button
        aria-busy={entrando}
        aria-haspopup={anfitriones.length > 1 ? 'dialog' : undefined}
        className={claseDelBoton ?? botonClases(variant)}
        disabled={entrando}
        onClick={() => (anfitriones.length === 1 ? entrarComo(anfitriones[0]!.userId) : dialogo.current?.showModal())}
        title={anfitriones.length === 1 ? `Entrar como ${anfitriones[0]!.email}` : undefined}
        type="button"
      >
        {entrando ? 'Entrando…' : 'Entrar como el cliente'}
      </button>
      {error !== null && anfitriones.length === 1 ? (
        <span className="text-[12px] text-danger" role="alert">
          {error}
        </span>
      ) : null}
      {anfitriones.length > 1 ? (
        <dialog
          aria-labelledby={`${id}-titulo`}
          className="m-auto w-[min(440px,92vw)] rounded-[18px] border border-line-panel bg-bg-raised p-6 text-left text-ink shadow-float backdrop:bg-ink/45"
          ref={dialogo}
        >
          <h2 className="font-display text-[22px] leading-tight" id={`${id}-titulo`}>
            Entrar como el cliente
          </h2>
          <p className="mt-2 text-[13px] leading-[1.6] text-ink-soft">Elige la cuenta. La entrada queda registrada en la auditoría.</p>
          <div className="mt-4 flex flex-col gap-2">
            {anfitriones.map((a) => (
              <button className={botonClases('default')} disabled={entrando} key={a.userId} onClick={() => entrarComo(a.userId)} type="button">
                {a.email}
              </button>
            ))}
          </div>
          {error === null ? null : (
            <p className="mt-3 text-[12.5px] text-danger" role="alert">
              {error}
            </p>
          )}
          <div className="mt-4 flex justify-end">
            <button className="text-[13px] text-ink-soft underline underline-offset-4" onClick={() => dialogo.current?.close()} type="button">
              Cancelar
            </button>
          </div>
        </dialog>
      ) : null}
    </>
  )
}
