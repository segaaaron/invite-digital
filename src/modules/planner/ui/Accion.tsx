'use client'

import { useActionState, type ReactNode } from 'react'
import { PanelButton } from '@/shared/design/ui/panel/PanelKit'
import type { PlannerActionState } from '../actions'

const INICIAL: PlannerActionState = { status: 'idle' }

export type Evento = { eventId: string; eventSlug: string }

export function Ocultos({ eventId, eventSlug, extra = {} }: Evento & { extra?: Record<string, string> }) {
  return (
    <>
      <input name="eventId" readOnly type="hidden" value={eventId} />
      <input name="eventSlug" readOnly type="hidden" value={eventSlug} />
      {Object.entries(extra).map(([k, v]) => (
        <input key={k} name={k} readOnly type="hidden" value={v} />
      ))}
    </>
  )
}

/** Un botón que es su propio formulario, con su error al lado. */
export function Accion({
  action,
  evento,
  extra,
  label,
  children,
  variant = 'default',
}: {
  action: (s: PlannerActionState, fd: FormData) => Promise<PlannerActionState>
  evento: Evento
  extra: Record<string, string>
  label: string
  children: ReactNode
  variant?: 'default' | 'danger' | 'primary'
}) {
  const [estado, enviar, enviando] = useActionState(action, INICIAL)
  return (
    <form action={enviar} className="inline-flex flex-col items-start gap-1">
      <Ocultos {...evento} extra={extra} />
      <PanelButton aria-label={label} disabled={enviando} title={label} type="submit" variant={variant}>
        {children}
      </PanelButton>
      {estado.status === 'error' ? (
        <span className="text-[11px] text-danger-deep" role="alert">
          {estado.message}
        </span>
      ) : null}
    </form>
  )
}
