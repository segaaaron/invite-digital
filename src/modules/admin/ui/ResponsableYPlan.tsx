'use client'

import { useActionState, useId } from 'react'
import { FIELD_CLASS, LABEL_CLASS } from '@/shared/design/ui/panel/PanelKit'
import { type AdminActionState } from '@/app/_acciones/admin/admin-comun'
import { reassignEventAction, setEventPlanAction } from '@/app/_acciones/admin/bodas-actions'
import { ActionFeedback, SubmitButton } from '@/shared/design/ui/panel/estados'

const INICIAL: AdminActionState = { status: 'idle' }

/**
 * Quién lleva el evento y con qué plan, en la ficha del evento. Vivían plegados en la fila de la
 * cartera, repetidos con el acceso y el borrado que ya estaban aquí: ahora todo lo que se
 * cambia de un evento está en su ficha, una sola vez.
 */
export function ResponsableYPlan({
  eventId,
  eventSlug,
  ownerId,
  planSlug,
  owners,
  plans,
}: {
  eventId: string
  eventSlug: string
  ownerId: string | null
  planSlug: string | null
  owners: readonly { id: string; email: string }[]
  plans: readonly { slug: string; nombre: string }[]
}) {
  const [reasignado, reasignar, reasignando] = useActionState<AdminActionState, FormData>(reassignEventAction, INICIAL)
  const [plan, cambiarPlan, cambiandoPlan] = useActionState<AdminActionState, FormData>(setEventPlanAction, INICIAL)
  const id = useId()

  return (
    <div className="flex flex-col gap-5">
      <form action={cambiarPlan} className="flex flex-col gap-2">
        <input name="eventId" type="hidden" value={eventId} />
        <input name="eventSlug" type="hidden" value={eventSlug} />
        <label className={LABEL_CLASS} htmlFor={`${id}-plan`}>
          Plan del evento
        </label>
        <div className="flex flex-wrap gap-2">
          <select className={`${FIELD_CLASS} max-w-[260px]`} defaultValue={planSlug ?? ''} id={`${id}-plan`} name="planSlug">
            {plans.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.nombre}
              </option>
            ))}
          </select>
          <SubmitButton pending={cambiandoPlan} pendingLabel="Cambiando…" variant="default">
            Cambiar plan
          </SubmitButton>
        </div>
        <p className="text-[12px] text-ink-mute">Se aplica en el momento: límites y funciones del evento cambian ya.</p>
        <ActionFeedback state={plan} />
      </form>

      <form action={reasignar} className="flex flex-col gap-2 border-t border-line-panel pt-5">
        <input name="eventId" type="hidden" value={eventId} />
        <label className={LABEL_CLASS} htmlFor={`${id}-dueno`}>
          Atelier responsable
        </label>
        <div className="flex flex-wrap gap-2">
          <select className={`${FIELD_CLASS} max-w-[320px]`} defaultValue={ownerId ?? ''} id={`${id}-dueno`} name="userId">
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.email}
              </option>
            ))}
          </select>
          <SubmitButton pending={reasignando} pendingLabel="Reasignando…" variant="default">
            Reasignar
          </SubmitButton>
        </div>
        <p className="text-[12px] text-ink-mute">Quien lleva el evento y lo ve en su bandeja. El cliente no cambia.</p>
        <ActionFeedback state={reasignado} />
      </form>
    </div>
  )
}
