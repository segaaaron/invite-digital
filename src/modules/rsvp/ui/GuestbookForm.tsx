'use client'

import { useId, useState } from 'react'
import type { InvitationDictionary } from '@/shared/i18n/dictionary'
import { useRsvp } from './use-rsvp'

type Props = {
  dictionary: InvitationDictionary
  token: string
  seats: number
  previous: { attending: number; message: string | null; responderName: string | null } | null
  /** El nombre del invitado del enlace, para firmar sin pedírselo. */
  guestName: string
}

/**
 * El libro de firmas de los diseños de boda: un campo de texto y «FIRMAR LIBRO».
 *
 * En la maqueta es su propia sección, con su titular en caligrafía, y no una casilla más
 * del formulario de confirmación. Escribe en el mismo sitio que el RSVP —el mensaje vive
 * en `rsvp_responses` desde la primera rebanada— y por eso reenvía el número de asistentes
 * que ya había: firmar el libro no es cambiar la respuesta.
 */
export function GuestbookForm({ dictionary, token, seats, previous, guestName }: Props) {
  const rsvp = useRsvp({ dictionary, previous, seats })
  const campoId = useId()
  // El botón no se habilita hasta que hay algo escrito, como en la maqueta.
  const [escrito, setEscrito] = useState((previous?.message ?? '').trim().length > 0)

  if (rsvp.confirmed) {
    return (
      <p aria-live="polite" className="py-4 text-center text-[14px] text-ink-soft" role="status">
        {dictionary.successBody}
      </p>
    )
  }

  return (
    <form action={rsvp.formAction} className="flex flex-col gap-2">
      <input name="token" type="hidden" value={token} readOnly />
      <input name="attending" type="hidden" value={String(previous?.attending ?? seats)} readOnly />
      <input name="name" type="hidden" value={previous?.responderName ?? guestName} readOnly />

      <label className="sr-only" htmlFor={campoId}>
        {dictionary.messageLabel}
      </label>
      <textarea
        className="min-h-[72px] w-full resize-none rounded-[6px] border border-[var(--color-line)] bg-transparent p-3 font-display text-[15px] italic text-ink outline-none"
        defaultValue={rsvp.defaultMessage}
        id={campoId}
        maxLength={500}
        name="message"
        onChange={(evento) => setEscrito(evento.target.value.trim().length > 0)}
        placeholder={dictionary.guestbookPlaceholder}
        rows={3}
      />

      {rsvp.error === null ? null : (
        <p className="text-[13px] text-danger" role="alert">
          {rsvp.error}
        </p>
      )}

      <button
        className="w-full rounded-[4px] border border-[var(--color-line)] py-3 font-display text-[11px] font-semibold tracking-[0.2em] text-ink uppercase disabled:opacity-40"
        disabled={rsvp.isPending || !escrito}
        type="submit"
      >
        {rsvp.isPending ? dictionary.sending : dictionary.signBook}
      </button>
    </form>
  )
}
