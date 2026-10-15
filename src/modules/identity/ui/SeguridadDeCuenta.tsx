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
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import type { T } from '@/shared/i18n/t'
import { useT } from '@/shared/i18n/idioma-navegador'

const ICONO = { computadora: LaptopIcon, celular: PhoneIcon, tablet: TabletIcon, desconocido: HelpIcon } as const
const clase = (t: T) => ({ computadora: t('Computadora', 'Computer'), celular: t('Celular', 'Phone'), tablet: t('Tablet', 'Tablet'), desconocido: t('Dispositivo', 'Device') }) as const

const MAX_VISIBLES = 3

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
  const t = useT()
  const [pedido, pedir, pidiendo] = useActionState(sinCaerse(requestAccountCodeAction), INICIAL)
  return (
    <form action={pedir} className="flex flex-col gap-2">
      <div>
        <SubmitButton pending={pidiendo} pendingLabel={t('Enviando…', 'Sending…')} variant="default">
          {pedido.status === 'sent' ? t('Enviar otro código', 'Send another code') : texto}
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
  const t = useT()
  const [estado, cerrar, cerrando] = useActionState(sinCaerse(closeOtherSessionsAction), INICIAL)
  const id = useId()
  const otras = sesiones.filter((s) => !s.esta).length
  // Cada inicio de sesión abre una y duran 30 días: la lista crece. Se enseñan las más recientes.
  const visibles = sesiones.slice(0, MAX_VISIBLES)
  const ocultas = sesiones.length - visibles.length

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col">
        {visibles.map((s) => (
          <li className="flex flex-wrap items-center justify-between gap-3 border-b border-line-panel py-3.5 last:border-none" key={s.id}>
            <span className="flex items-center gap-3">
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-pill-pending text-gold-deep">
                {(() => {
                  const Icono = ICONO[s.tipo]
                  return <Icono className="size-5" />
                })()}
              </span>
              <span className="flex flex-col">
              <span className="text-[15px] font-medium">{`${clase(t)[s.tipo]}, ${s.dispositivo.replace(/ · /g, ', ')}`}</span>
              <span className="text-[13.5px] text-ink-mute">{s.ultimoUso}</span>
              </span>
            </span>
            {s.esta ? <Pill tone="ok">{t('Este aparato', 'This device')}</Pill> : null}
          </li>
        ))}
        {ocultas > 0 ? (
          <li className="py-3 text-[13px] text-ink-mute">
            {t(`y ${ocultas} sesi${ocultas === 1 ? 'ón' : 'ones'} más, de antes`, `and ${ocultas} older session${ocultas === 1 ? '' : 's'}`)}
          </li>
        ) : null}
      </ul>

      {otras === 0 ? (
        <p className="text-[13px] text-ink-mute">{t('Solo está abierta tu sesión en este dispositivo.', 'Only your session on this device is open.')}</p>
      ) : (
        <details className="group flex flex-col gap-3">
          <summary className="inline-flex min-h-10 w-fit cursor-pointer list-none items-center rounded-[10px] border border-line-panel-strong bg-bg-raised px-4 text-[14px] font-medium hover:border-gold group-open:mb-3 [&::-webkit-details-marker]:hidden">
            {t('Cerrar en los demás aparatos', 'Sign out of other devices')}
          </summary>
          <p className="mb-3 text-[13.5px] leading-[1.6] text-ink-soft">
            {t(
              `Para cerrar ${otras === 1 ? 'la otra sesión' : `las otras ${otras}`} te mandamos un código a tu correo: así solo tú puedes sacar a los demás.`,
              `To close ${otras === 1 ? 'the other session' : `the other ${otras}`} we send a code to your email: that way only you can sign the others out.`,
            )}
          </p>
          <PedirCodigo texto={t('Enviarme el código', 'Send me the code')} />
          <form action={cerrar} className="flex flex-wrap items-end gap-3">
            <Field htmlFor={`${id}-codigo`} label={t('Código del correo', 'Code from the email')}>
              <input autoComplete="one-time-code" className={`${FIELD_CLASS} w-[160px] font-codigo tracking-[0.2em]`} id={`${id}-codigo`} inputMode="numeric" maxLength={9} name="code" required />
            </Field>
            <SubmitButton pending={cerrando} pendingLabel={t('Cerrando…', 'Signing out…')} variant="danger">
              {t('Cerrar las demás sesiones', 'Sign out other sessions')}
            </SubmitButton>
          </form>
        </details>
      )}
      <ActionFeedback state={estado.status === 'idle' ? { status: 'idle' } : { status: estado.status === 'done' ? 'success' : 'error', message: estado.message }} />
    </div>
  )
}
