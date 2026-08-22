'use client'

import { useActionState } from 'react'
import { revokeInvitationAction, type RevokeInvitationState } from '../actions'
import type { GuestErrorKind } from '../domain/errors'

const INITIAL: RevokeInvitationState = { status: 'idle' }

const MENSAJES: Record<GuestErrorKind, string> = {
  invalid_label: 'No pudimos revocar la invitación: los datos del grupo no son válidos.',
  invalid_seats: 'No pudimos revocar la invitación: los datos del grupo no son válidos.',
  not_found: 'Ese grupo ya no existe. Vuelve a cargar la página.',
  revoked: 'Esa invitación ya estaba revocada.',
  plan_limit_reached: 'No pudimos revocar la invitación. Inténtalo en un momento.',
  storage_failure: 'No pudimos revocar la invitación. El enlace sigue activo; inténtalo en un momento.',
}

/**
 * El aviso va aquí, junto al botón, y no en una franja al principio de la página: quien
 * pulsa «Revocar» está mirando esta fila. Que el enlace siga activo es justo lo que hay
 * que decir, porque es lo que el atelier daría por hecho que no pasó.
 */
export function RevokeInvitationForm({ groupId, eventSlug }: { groupId: string; eventSlug: string }) {
  const [state, formAction, isPending] = useActionState(revokeInvitationAction, INITIAL)

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input name="groupId" type="hidden" value={groupId} readOnly />
        <input name="eventSlug" type="hidden" value={eventSlug} readOnly />
        <button
          className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute hover:text-gold-deep disabled:opacity-40"
          disabled={isPending}
          type="submit"
        >
          {isPending ? 'Revocando…' : 'Revocar'}
        </button>
      </form>

      {state.status === 'error' ? (
        <p className="text-right text-[11px] text-danger" role="alert">
          {MENSAJES[state.message]}
        </p>
      ) : null}
    </div>
  )
}
