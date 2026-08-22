'use client'

import { useActionState, useId } from 'react'
import { type PlanChangeState, requestPlanChangeAction } from '../actions'
import type { PlansErrorKind } from '../domain/errors'

const INITIAL: PlanChangeState = { status: 'idle' }

const MENSAJES: Record<PlansErrorKind, string> = {
  plan_limit_reached: 'El plan actual ya está al tope.',
  feature_not_included: 'Esa función no viene con el plan actual.',
  request_already_pending: 'Ya hay una solicitud sin resolver para este evento.',
  same_plan: 'El evento ya está en ese plan.',
  already_resolved: 'Esa solicitud ya estaba resuelta.',
  not_found: 'Ese plan ya no está disponible.',
  storage_failure: 'No pudimos registrar la solicitud. Inténtalo en un momento.',
}

const FIELD_CLASS =
  'w-full rounded-[14px] border border-[var(--color-line)] bg-bg-top/80 px-4 py-3 text-[14px] text-ink outline-none transition-colors focus-visible:border-gold'

const LABEL_CLASS = 'flex flex-col gap-2 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute'

export function PlanChangeForm({
  eventId,
  eventSlug,
  options,
}: {
  eventId: string
  eventSlug: string
  options: ReadonlyArray<{ id: string; slug: string }>
}) {
  const [state, formAction, isPending] = useActionState(requestPlanChangeAction, INITIAL)
  const planId = useId()
  const noteId = useId()

  // Sin otro plan al que ir no hay formulario que enseñar. Es el caso del plan más caro,
  // y un desplegable vacío solo invitaría a pulsar para nada.
  if (options.length === 0) return null

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded-[18px] border border-line p-6">
      <input name="eventId" type="hidden" value={eventId} readOnly />
      <input name="eventSlug" type="hidden" value={eventSlug} readOnly />

      <label className={LABEL_CLASS} htmlFor={planId}>
        Plan que se quiere
        <select className={FIELD_CLASS} id={planId} name="planId" required>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.slug}
            </option>
          ))}
        </select>
      </label>

      <label className={LABEL_CLASS} htmlFor={noteId}>
        Nota para el atelier
        <textarea className={FIELD_CLASS} id={noteId} maxLength={500} name="note" rows={3} />
      </label>

      {state.status === 'error' ? (
        <p className="text-[13px] text-gold-deep" role="alert">
          {MENSAJES[state.kind]}
        </p>
      ) : null}

      {state.status === 'success' ? (
        <p aria-live="polite" className="text-[13px] text-ink" role="status">
          Solicitud registrada para el plan {state.planSlug}. El atelier la resolverá y la aplicará aquí mismo.
        </p>
      ) : null}

      <button
        className="self-start rounded-[var(--radius-pill)] bg-gold px-7 py-3 text-[12px] uppercase tracking-[var(--tracking-luxe)] text-bg-raised disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending ? 'Enviando…' : 'Solicitar cambio'}
      </button>
    </form>
  )
}
