'use client'

import { useActionState } from 'react'
import { applyPlanChangeAction, type PlanDecisionState, rejectPlanChangeAction } from '@/app/_acciones/plans/actions'
import type { PlansErrorKind } from '../domain/errors'
import { SubmitButton } from '@/shared/design/ui/panel/estados'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import type { T } from '@/shared/i18n/t'
import { useT } from '@/shared/i18n/idioma-navegador'

const INITIAL: PlanDecisionState = { status: 'idle' }

const mensajes = (t: T): Record<PlansErrorKind, string> => ({
  plan_limit_reached: t('No pudimos resolver la solicitud: el plan de destino no admite las invitaciones que ya tiene el evento.', 'We could not resolve the request: the target plan does not allow the invitations the event already has.'),
  feature_not_included: t('No pudimos resolver la solicitud con ese plan.', 'We could not resolve the request with that plan.'),
  request_already_pending: t('Hay otra solicitud sin resolver para este evento.', 'There is another unresolved request for this event.'),
  same_plan: t('El evento ya está en ese plan.', 'The event is already on that plan.'),
  already_resolved: t('Esa solicitud ya estaba resuelta. Vuelve a cargar la página.', 'That request was already resolved. Reload the page.'),
  not_found: t('Esa solicitud ya no existe. Vuelve a cargar la página.', 'That request no longer exists. Reload the page.'),
  storage_failure: t('No pudimos resolver la solicitud. Sigue pendiente; inténtalo en un momento.', 'We could not resolve the request. It is still pending; try again in a moment.'),
})

/**
 * Aplicar y descartar una solicitud de cambio de plan. Va en un componente de cliente
 * porque las dos acciones tienen ahora estado que enseñar: antes devolvían `void` y la
 * página se repintaba igual hubiera funcionado o no, así que un cambio cobrado y no
 * aplicado se leía exactamente igual que uno aplicado.
 */
export function PlanDecisionForms({ requestId, eventSlug }: { requestId: string; eventSlug: string }) {
  const t = useT()
  const [aplicar, aplicarAction, aplicando] = useActionState(sinCaerse(applyPlanChangeAction, { status: 'error', kind: 'storage_failure' }), INITIAL)
  const [descartar, descartarAction, descartando] = useActionState(sinCaerse(rejectPlanChangeAction, { status: 'error', kind: 'storage_failure' }), INITIAL)

  const fallo =
    aplicar.status === 'error' ? aplicar.kind : descartar.status === 'error' ? descartar.kind : null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <form action={aplicarAction}>
          <input name="requestId" type="hidden" value={requestId} readOnly />
          <input name="eventSlug" type="hidden" value={eventSlug} readOnly />
          <SubmitButton variant="primary" pending={aplicando} pendingLabel={t('Aplicando…', 'Applying…')}>{t('Aplicar el cambio', 'Apply the change')}</SubmitButton>
        </form>

        <form action={descartarAction}>
          <input name="requestId" type="hidden" value={requestId} readOnly />
          <input name="eventSlug" type="hidden" value={eventSlug} readOnly />
          <SubmitButton variant="default" pending={descartando} pendingLabel={t('Descartando…', 'Discarding…')}>{t('Descartar', 'Discard')}</SubmitButton>
        </form>
      </div>

      {fallo === null ? null : (
        <p className="text-[12px] text-danger" role="alert">
          {mensajes(t)[fallo]}
        </p>
      )}
    </div>
  )
}
