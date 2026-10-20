'use client'

import { useActionState } from 'react'
import { revokeInvitationAction, type RevokeInvitationState } from '@/app/_acciones/guests/actions'
import type { GuestErrorKind } from '../domain/errors'
import { sinCaerse } from '@/shared/design/ui/sin-caerse'
import { useT } from '@/shared/i18n/idioma-navegador'
import type { T } from '@/shared/i18n/t'

const INITIAL: RevokeInvitationState = { status: 'idle' }

const mensajes = (t: T): Record<GuestErrorKind, string> => ({
  invalid_label: t('No pudimos revocar la invitación: los datos no son válidos.', 'We couldn’t revoke the invitation: the data is not valid.'),
  invalid_seats: t('No pudimos revocar la invitación: los datos no son válidos.', 'We couldn’t revoke the invitation: the data is not valid.'),
  not_found: t('Esa invitación ya no existe. Vuelve a cargar la página.', 'That invitation no longer exists. Reload the page.'),
  revoked: t('Esa invitación ya estaba revocada.', 'That invitation was already revoked.'),
  // Inalcanzable desde el panel —revocar no resuelve tokens— pero el tipo obliga a decidirlo, que es lo
  // que impide que un caso nuevo llegue a pantalla como una cadena vacía.
  demo_expired: t('Esa demostración ya caducó.', 'That demo has expired.'),
  plan_limit_reached: t('No pudimos revocar la invitación. Inténtalo en un momento.', 'We couldn’t revoke the invitation. Try again in a moment.'),
  storage_failure: t('No pudimos revocar la invitación. El enlace sigue activo; inténtalo en un momento.', 'We couldn’t revoke the invitation. The link is still active; try again in a moment.'),
})

/**
 * El aviso va aquí, junto al botón, y no en una franja al principio de la página: quien
 * pulsa «Revocar» está mirando esta fila. Que el enlace siga activo es justo lo que hay
 * que decir, porque es lo que el atelier daría por hecho que no pasó.
 */
export function RevokeInvitationForm({ groupId, eventSlug }: { groupId: string; eventSlug: string }) {
  const t = useT()
  const [state, formAction, isPending] = useActionState(sinCaerse(revokeInvitationAction, { status: 'error', message: 'storage_failure' }), INITIAL)

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input name="groupId" type="hidden" value={groupId} readOnly />
        <input name="eventSlug" type="hidden" value={eventSlug} readOnly />
        <button
          className="text-[12px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute hover:text-gold-deep disabled:opacity-40"
          disabled={isPending}
          type="submit" aria-busy={(isPending) || undefined}>
          {isPending ? t('Revocando…', 'Revoking…') : t('Revocar enlace', 'Revoke link')}
        </button>
      </form>

      {state.status === 'error' ? (
        <p className="text-right text-[12px] text-danger" role="alert">
          {mensajes(t)[state.message]}
        </p>
      ) : null}
    </div>
  )
}
