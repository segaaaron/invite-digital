'use client'

import { useActionState, useId } from 'react'
import { addGuestGroupAction, type AddGuestGroupState } from '../actions'
import type { GuestErrorKind } from '../domain/errors'
import { CopyLinkButton } from './CopyLinkButton'

const INITIAL: AddGuestGroupState = { status: 'idle' }

const MESSAGES: Record<GuestErrorKind, string> = {
  invalid_label: 'La etiqueta va de 1 a 160 caracteres.',
  invalid_seats: 'Los cupos son un número entero de 1 en adelante.',
  not_found: 'Ese grupo ya no existe.',
  revoked: 'Esa invitación está revocada.',
  plan_limit_reached: 'El plan del evento no admite más grupos. Solicita un cambio de plan para seguir.',
  storage_failure: 'No pudimos guardar el grupo. Inténtalo en un momento.',
}

const FIELD_CLASS =
  'w-full rounded-[14px] border border-[var(--color-line)] bg-bg-top/80 px-4 py-3 text-[14px] text-ink outline-none transition-colors focus-visible:border-gold'

const LABEL_CLASS = 'flex flex-col gap-2 text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute'

export function GuestGroupForm({ eventId, eventSlug }: { eventId: string; eventSlug: string }) {
  const [state, formAction, isPending] = useActionState(addGuestGroupAction, INITIAL)
  const labelId = useId()
  const seatsId = useId()

  return (
    <div className="flex flex-col gap-5 rounded-[18px] border border-[var(--color-line)] p-6">
      <form action={formAction} className="flex flex-col gap-5">
        <input name="eventId" type="hidden" value={eventId} readOnly />
        <input name="eventSlug" type="hidden" value={eventSlug} readOnly />

        <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
          <label className={LABEL_CLASS} htmlFor={labelId}>
            Grupo invitado
            <input className={FIELD_CLASS} id={labelId} maxLength={160} name="label" placeholder="Familia Rojas Peña" required type="text" />
          </label>

          <label className={LABEL_CLASS} htmlFor={seatsId}>
            Cupos
            <input className={FIELD_CLASS} defaultValue={2} id={seatsId} min={1} name="seats" required type="number" />
          </label>
        </div>

        {state.status === 'error' ? (
          <p className="text-[13px] text-gold-deep" role="alert">
            {MESSAGES[state.message]}
          </p>
        ) : null}

        <button
          className="self-start rounded-[var(--radius-pill)] bg-gold px-7 py-3 text-[12px] uppercase tracking-[var(--tracking-luxe)] text-bg-raised disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? 'Creando…' : 'Crear invitación'}
        </button>
      </form>

      {state.status === 'success' ? (
        <div aria-live="polite" className="flex flex-col gap-3 border-t border-[var(--color-line)] pt-5" role="status">
          <p className="text-[13px] text-ink">
            Enlace de <strong className="font-normal">{state.label}</strong>. Cópialo ahora: no podremos volver a mostrarlo.
          </p>
          <CopyLinkButton url={state.url} />
        </div>
      ) : null}
    </div>
  )
}
