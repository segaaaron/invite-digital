'use client'

import { useActionState, useId } from 'react'
import {
  closeOtherSessionsAction,
  requestAccountCodeAction,
  type CodigoDeCuentaState,
} from '@/app/_acciones/identity/actions'
import { FIELD_CLASS, Field, Pill } from '@/shared/design/ui/panel/PanelKit'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'
import { HelpIcon, LaptopIcon, PhoneIcon, TabletIcon } from '@/shared/design/ui/icons'
import type { TipoDeDispositivo } from '../domain/dispositivo'

const ICONO = { computadora: LaptopIcon, celular: PhoneIcon, tablet: TabletIcon, desconocido: HelpIcon } as const
const CLASE = { computadora: 'Computadora', celular: 'Celular', tablet: 'Tablet', desconocido: 'Dispositivo' } as const

const MAX_VISIBLES = 5

const INICIAL: CodigoDeCuentaState = { status: 'idle', message: '' }

export type SesionVista = {
  readonly id: string
  readonly dispositivo: string
  readonly tipo: TipoDeDispositivo
  /** «hace 5 min», «ayer 20:14»: ya formateado por la página. */
  readonly ultimoUso: string
  readonly esta: boolean
}

/**
 * El código al correo del dueño. Con la contraseña compartida todos entran como la misma
 * cuenta: el correo es lo único que distingue a quien la compró.
 */
function PedirCodigo({ texto }: { texto: string }) {
  const [pedido, pedir, pidiendo] = useActionState(requestAccountCodeAction, INICIAL)
  return (
    <form action={pedir} className="flex flex-col gap-2">
      <div>
        <SubmitButton pending={pidiendo} pendingLabel="Enviando…" variant="default">
          {pedido.status === 'sent' ? 'Enviar otro código' : texto}
        </SubmitButton>
      </div>
      {pedido.status === 'idle' ? null : (
        <p className={`text-[12.5px] ${pedido.status === 'error' ? 'text-danger' : 'text-ink-soft'}`} role={pedido.status === 'error' ? 'alert' : 'status'}>
          {pedido.message}
        </p>
      )}
    </form>
  )
}

/** Las sesiones abiertas de la cuenta y el botón para cerrar las demás. */
export function SesionesAbiertas({ sesiones }: { sesiones: readonly SesionVista[] }) {
  const [estado, cerrar, cerrando] = useActionState(closeOtherSessionsAction, INICIAL)
  const id = useId()
  const otras = sesiones.filter((s) => !s.esta).length
  // Cada inicio de sesión abre una y duran 30 días: la lista crece. Se enseñan las más recientes.
  const visibles = sesiones.slice(0, MAX_VISIBLES)
  const ocultas = sesiones.length - visibles.length

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-line-panel rounded-[14px] border border-line-panel bg-white">
        {visibles.map((s) => (
          <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={s.id}>
            <span className="flex items-center gap-3">
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-bg-top text-ink-soft">
                {(() => {
                  const Icono = ICONO[s.tipo]
                  return <Icono className="size-5" />
                })()}
              </span>
              <span className="flex flex-col">
              <span className="text-[14px] text-ink">{`${CLASE[s.tipo]} · ${s.dispositivo}`}</span>
              <span className="text-[12px] text-ink-mute">Último uso: {s.ultimoUso}</span>
              </span>
            </span>
            {s.esta ? <Pill tone="ok">Este dispositivo</Pill> : null}
          </li>
        ))}
        {ocultas > 0 ? (
          <li className="px-4 py-3 text-[12px] text-ink-mute">
            y {ocultas} sesi{ocultas === 1 ? 'ón' : 'ones'} más, de antes
          </li>
        ) : null}
      </ul>

      {otras === 0 ? (
        <p className="text-[13px] text-ink-mute">Solo está abierta tu sesión en este dispositivo.</p>
      ) : (
        <div className="flex flex-col gap-3 rounded-[16px] border border-line-panel bg-bg-raised p-4">
          <p className="text-[13px] leading-[1.6] text-ink-soft">
            Para cerrar {otras === 1 ? 'la otra sesión' : `las otras ${otras}`} te mandamos un código a tu correo: así solo tú puedes sacar a los demás.
          </p>
          <PedirCodigo texto="Enviarme el código" />
          <form action={cerrar} className="flex flex-wrap items-end gap-3">
            <Field htmlFor={`${id}-codigo`} label="Código del correo">
              <input autoComplete="one-time-code" className={`${FIELD_CLASS} w-[160px] font-mono tracking-[0.2em]`} id={`${id}-codigo`} inputMode="numeric" maxLength={9} name="code" required />
            </Field>
            <SubmitButton pending={cerrando} pendingLabel="Cerrando…" variant="danger">
              Cerrar las demás sesiones
            </SubmitButton>
          </form>
        </div>
      )}
      <ActionFeedback state={estado.status === 'idle' ? { status: 'idle' } : { status: estado.status === 'done' ? 'success' : 'error', message: estado.message }} />
    </div>
  )
}
