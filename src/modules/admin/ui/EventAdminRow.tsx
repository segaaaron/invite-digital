'use client'

import Link from 'next/link'
import { useActionState, useId, useState } from 'react'
import { FIELD_CLASS, LABEL_CLASS, PanelButton, Pill } from '@/shared/design/ui/panel/PanelKit'
import {
  deleteEventAsAdminAction,
  reassignEventAction,
  setEventPlanAction,
  type AdminActionState,
} from '../actions'

const INICIAL: AdminActionState = { status: 'idle' }

export type EventAdminView = {
  readonly id: string
  readonly slug: string
  readonly title: string
  readonly eventDate: string
  readonly ownerEmail: string | null
  readonly ownerId: string | null
  readonly planSlug: string | null
  readonly grupos: number
}

export type OwnerChoice = { readonly id: string; readonly email: string }

/**
 * Una fila de la bandeja de eventos del admin, con sus tres mandos.
 *
 * Borrar pide escribir el `slug`, como la zona de peligro del propio evento: se lleva por
 * delante invitados, mesas, regalos y mensajes, y no se deshace. Un botón suelto para eso
 * en una lista de veinte filas es un accidente esperando a pasar.
 */
export function EventAdminRow({ event, owners, plans }: { event: EventAdminView; owners: readonly OwnerChoice[]; plans: readonly string[] }) {
  const [reasignado, reasignar, reasignando] = useActionState<AdminActionState, FormData>(reassignEventAction, INICIAL)
  const [plan, cambiarPlan, cambiandoPlan] = useActionState<AdminActionState, FormData>(setEventPlanAction, INICIAL)
  const [borrado, borrar, borrando] = useActionState<AdminActionState, FormData>(deleteEventAsAdminAction, INICIAL)
  const [confirmando, setConfirmando] = useState(false)
  const id = useId()

  const error =
    reasignado.status === 'error'
      ? reasignado.message
      : plan.status === 'error'
        ? plan.message
        : borrado.status === 'error'
          ? borrado.message
          : null

  return (
    <li className="flex flex-col gap-3 border-b border-line-panel py-4 last:border-none">
      <div className="flex flex-wrap items-center gap-3">
        <span className="min-w-0 flex-1">
          <Link className="text-[14px] text-ink underline-offset-4 hover:underline" href={`/panel/eventos/${event.slug}`}>
            {event.title}
          </Link>
          <span className="mt-1 block text-[11px] text-ink-mute">
            {event.slug} · {event.eventDate} · {event.grupos} grupo{event.grupos === 1 ? '' : 's'}
          </span>
        </span>

        {/* Un evento sin dueño no debería existir; si aparece uno, la fila lo canta en
            vez de enseñar un hueco. */}
        {event.ownerEmail === null ? (
          <Pill tone="no">Sin dueño</Pill>
        ) : (
          <span className="text-[12px] text-ink-soft">{event.ownerEmail}</span>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <form action={reasignar} className="flex items-end gap-2">
          <input name="eventId" type="hidden" value={event.id} />
          <span className="flex flex-col gap-1.5">
            <label className={LABEL_CLASS} htmlFor={`${id}-dueno`}>
              Dueño
            </label>
            <select className={`${FIELD_CLASS} py-2`} defaultValue={event.ownerId ?? ''} id={`${id}-dueno`} name="userId">
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.email}
                </option>
              ))}
            </select>
          </span>
          <PanelButton disabled={reasignando} type="submit">
            Reasignar
          </PanelButton>
        </form>

        <form action={cambiarPlan} className="flex items-end gap-2">
          <input name="eventId" type="hidden" value={event.id} />
          <input name="eventSlug" type="hidden" value={event.slug} />
          <span className="flex flex-col gap-1.5">
            <label className={LABEL_CLASS} htmlFor={`${id}-plan`}>
              Plan
            </label>
            <select className={`${FIELD_CLASS} py-2`} defaultValue={event.planSlug ?? ''} id={`${id}-plan`} name="planSlug">
              {plans.map((slug) => (
                <option key={slug} value={slug}>
                  {slug}
                </option>
              ))}
            </select>
          </span>
          <PanelButton disabled={cambiandoPlan} type="submit">
            Cambiar
          </PanelButton>
        </form>

        {confirmando ? (
          <form action={borrar} className="flex items-end gap-2">
            <input name="eventId" type="hidden" value={event.id} />
            <span className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS} htmlFor={`${id}-conf`}>
                Escribe {event.slug}
              </label>
              <input autoFocus className={`${FIELD_CLASS} py-2`} id={`${id}-conf`} name="confirmation" required type="text" />
            </span>
            <PanelButton disabled={borrando} type="submit" variant="danger">
              Borrar de verdad
            </PanelButton>
            <PanelButton onClick={() => setConfirmando(false)}>Cancelar</PanelButton>
          </form>
        ) : (
          <PanelButton onClick={() => setConfirmando(true)} variant="danger">
            Borrar evento
          </PanelButton>
        )}
      </div>

      {error === null ? null : (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}
