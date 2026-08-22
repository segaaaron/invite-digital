'use client'

import { useActionState } from 'react'
import { applyPlanChangeAction, type PlanDecisionState, rejectPlanChangeAction } from '../actions'
import type { PlansErrorKind } from '../domain/errors'

const INITIAL: PlanDecisionState = { status: 'idle' }

const MENSAJES: Record<PlansErrorKind, string> = {
  plan_limit_reached: 'No pudimos resolver la solicitud: el plan de destino no admite los grupos que ya tiene el evento.',
  feature_not_included: 'No pudimos resolver la solicitud con ese plan.',
  request_already_pending: 'Hay otra solicitud sin resolver para este evento.',
  same_plan: 'El evento ya está en ese plan.',
  already_resolved: 'Esa solicitud ya estaba resuelta. Vuelve a cargar la página.',
  not_found: 'Esa solicitud ya no existe. Vuelve a cargar la página.',
  storage_failure: 'No pudimos resolver la solicitud. Sigue pendiente; inténtalo en un momento.',
}

const BOTON = 'rounded-full border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[var(--tracking-luxe)] text-ink disabled:opacity-40'

/**
 * Aplicar y descartar una solicitud de cambio de plan. Va en un componente de cliente
 * porque las dos acciones tienen ahora estado que enseñar: antes devolvían `void` y la
 * página se repintaba igual hubiera funcionado o no, así que un cambio cobrado y no
 * aplicado se leía exactamente igual que uno aplicado.
 */
export function PlanDecisionForms({ requestId, eventSlug }: { requestId: string; eventSlug: string }) {
  const [aplicar, aplicarAction, aplicando] = useActionState(applyPlanChangeAction, INITIAL)
  const [descartar, descartarAction, descartando] = useActionState(rejectPlanChangeAction, INITIAL)

  const fallo =
    aplicar.status === 'error' ? aplicar.kind : descartar.status === 'error' ? descartar.kind : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <form action={aplicarAction}>
          <input name="requestId" type="hidden" value={requestId} readOnly />
          <input name="eventSlug" type="hidden" value={eventSlug} readOnly />
          <button className={BOTON} disabled={aplicando} type="submit">
            {aplicando ? 'Aplicando…' : 'Aplicar el cambio'}
          </button>
        </form>

        <form action={descartarAction}>
          <input name="requestId" type="hidden" value={requestId} readOnly />
          <input name="eventSlug" type="hidden" value={eventSlug} readOnly />
          <button
            className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute disabled:opacity-40"
            disabled={descartando}
            type="submit"
          >
            {descartando ? 'Descartando…' : 'Descartar'}
          </button>
        </form>
      </div>

      {fallo === null ? null : (
        <p className="text-[12px] text-danger" role="alert">
          {MENSAJES[fallo]}
        </p>
      )}
    </div>
  )
}
