'use client'

import { useActionState, useId, useState } from 'react'
import type { InvitationDictionary } from '@/shared/i18n/dictionary'
import { respondAction, type RsvpActionState } from '../actions'

const INITIAL: RsvpActionState = { status: 'idle' }

const FIELD_CLASS =
  'w-full rounded-[14px] border border-[var(--color-line)] bg-bg-top/80 px-4 py-3 text-[14px] text-ink outline-none transition-colors focus-visible:border-gold'

const LABEL_CLASS = 'flex flex-col gap-2 text-left text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute'

type Props = {
  dictionary: InvitationDictionary
  seats: number
  token: string
  previous: { attending: number; message: string | null } | null
}

export function RsvpForm({ dictionary, seats, token, previous }: Props) {
  const [state, formAction, isPending] = useActionState(respondAction, INITIAL)
  // Cada resultado es un objeto nuevo, así que recordar el ya reconocido devuelve el
  // formulario al pulsar "cambiar" y vuelve a enseñar el panel tras el siguiente envío.
  const [acknowledged, setAcknowledged] = useState<RsvpActionState | null>(null)
  const attendingId = useId()
  const messageId = useId()

  if (state.status === 'success' && acknowledged !== state) {
    return (
      <div aria-live="polite" className="flex flex-col items-center gap-4" role="status">
        <p className="font-display text-[24px] font-light text-ink">{dictionary.successTitle}</p>
        <p className="text-[14px] leading-[1.7] text-ink-soft">{dictionary.successBody}</p>
        <button
          className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep underline-offset-4 hover:underline"
          onClick={() => setAcknowledged(state)}
          type="button"
        >
          {dictionary.change}
        </button>
      </div>
    )
  }

  const error = state.status === 'error' ? dictionary.errors[state.message] : null
  const opciones = Array.from({ length: seats + 1 }, (_, index) => index)

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <input name="token" type="hidden" value={token} readOnly />

      <label className={LABEL_CLASS} htmlFor={attendingId}>
        {dictionary.attendingLabel}
        <select className={FIELD_CLASS} defaultValue={String(previous?.attending ?? seats)} id={attendingId} name="attending">
          {opciones.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      </label>

      <label className={LABEL_CLASS} htmlFor={messageId}>
        {dictionary.messageLabel}
        <textarea className={FIELD_CLASS} defaultValue={previous?.message ?? ''} id={messageId} maxLength={500} name="message" rows={3} />
      </label>

      {error ? (
        <p className="text-[13px] text-gold-deep" role="alert">
          {error}
        </p>
      ) : null}

      <button
        className="rounded-[var(--radius-pill)] bg-gold px-7 py-3.5 text-[12px] uppercase tracking-[var(--tracking-luxe)] text-bg-raised transition-transform duration-300 hover:-translate-y-0.5 hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        disabled={isPending}
        type="submit"
      >
        {isPending ? dictionary.sending : dictionary.submit}
      </button>
    </form>
  )
}
