'use client'

import { useActionState, useId } from 'react'
import { type PlanChangeState, requestPlanChangeAction } from '@/app/_acciones/plans/actions'
import type { PlansErrorKind } from '../domain/errors'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import type { T } from '@/shared/i18n/t'
import { useT } from '@/shared/i18n/idioma-navegador'

const INITIAL: PlanChangeState = { status: 'idle' }

const mensajes = (t: T): Record<PlansErrorKind, string> => ({
  plan_limit_reached: t('El plan actual ya está al tope.', 'The current plan is already at its limit.'),
  feature_not_included: t('Esa función no viene con el plan actual.', 'That feature is not part of the current plan.'),
  request_already_pending: t('Ya hay una solicitud sin resolver para este evento.', 'There is already an unresolved request for this event.'),
  same_plan: t('El evento ya está en ese plan.', 'The event is already on that plan.'),
  already_resolved: t('Esa solicitud ya estaba resuelta.', 'That request was already resolved.'),
  not_found: t('Ese plan ya no está disponible.', 'That plan is no longer available.'),
  storage_failure: t('No pudimos registrar la solicitud. Inténtalo en un momento.', 'We could not record the request. Try again in a moment.'),
})

const FIELD_CLASS =
  'w-full rounded-[14px] border border-line-panel-strong bg-white px-4 py-3 text-[14px] text-ink outline-none transition-colors focus-visible:border-ink'

const LABEL_CLASS = 'flex flex-col gap-2 text-[12px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute'

export function PlanChangeForm({
  eventId,
  eventSlug,
  options,
  defaultPlanSlug = null,
}: {
  eventId: string
  eventSlug: string
  options: ReadonlyArray<{ id: string; slug: string; name: string }>
  /** El plan que se pulsó en su tarjeta, ya elegido en el desplegable. */
  defaultPlanSlug?: string | null
}) {
  const t = useT()
  const [state, formAction, isPending] = useActionState(sinCaerse(requestPlanChangeAction, { status: 'error', kind: 'storage_failure' }), INITIAL)
  const planId = useId()
  const noteId = useId()

  // Sin otro plan al que ir no hay formulario que enseñar. Es el caso del plan más caro,
  // y un desplegable vacío solo invitaría a pulsar para nada.
  if (options.length === 0) return null

  return (
    <form action={formAction} className="flex flex-col gap-5 rounded-[18px] border border-line-panel p-6">
      <input name="eventId" type="hidden" value={eventId} readOnly />
      <input name="eventSlug" type="hidden" value={eventSlug} readOnly />

      <label className={LABEL_CLASS} htmlFor={planId}>
        {t('Plan que se quiere', 'Desired plan')}
        <select
          className={FIELD_CLASS}
          defaultValue={options.find((option) => option.slug === defaultPlanSlug)?.id}
          id={planId}
          name="planId"
          required
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>

      <label className={LABEL_CLASS} htmlFor={noteId}>
        {t('Nota para el atelier', 'Note for the atelier')}
        <textarea className={FIELD_CLASS} id={noteId} maxLength={500} name="note" rows={3} />
      </label>

      {state.status === 'error' ? (
        <p className="text-[13px] text-gold-deep" role="alert">
          {mensajes(t)[state.kind]}
        </p>
      ) : null}

      {state.status === 'success' ? (
        <p aria-live="polite" className="text-[13px] text-ink" role="status">
          {t(`Solicitud registrada para el plan ${state.planSlug}. El atelier la resolverá y la aplicará aquí mismo.`, `Request recorded for the ${state.planSlug} plan. The atelier will resolve it and apply it right here.`)}
        </p>
      ) : null}

      <button
        className="self-start cursor-pointer rounded-[var(--radius-pill)] border border-shell-deep bg-linear-to-b from-shell to-shell-deep px-4.5 py-2.5 max-[859px]:min-h-11 font-mono text-[12px] tracking-[0.25em] text-white uppercase transition-all duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
        disabled={isPending}
        type="submit" aria-busy={(isPending) || undefined}>
        {isPending ? t('Enviando…', 'Sending…') : t('Solicitar cambio', 'Request change')}
      </button>
    </form>
  )
}
