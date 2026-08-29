'use client'

import { useId } from 'react'
import { ConfettiBurst } from '@/shared/design/ui/ConfettiBurst'
import type { InvitationDictionary } from '@/shared/i18n/dictionary'
import { useRsvp } from './use-rsvp'

const FIELD_CLASS =
  'w-full rounded-[14px] border border-[var(--color-line)] bg-bg-top/80 px-4 py-3 text-[14px] text-ink outline-none transition-colors focus-visible:border-gold'

const LABEL_CLASS = 'flex flex-col gap-2 text-left text-[11px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute'

type Props = {
  dictionary: InvitationDictionary
  seats: number
  token: string
  previous: { attending: number; message: string | null } | null
}

/**
 * El formulario de RSVP del tema **clásico**.
 *
 * Su estado vive en `useRsvp`, que es lo que reutilizan los dieciséis diseños para pintar
 * el suyo: la maqueta trae seis marcados distintos solo entre los de XV, y este lleva la
 * paleta marfil clavada en las clases. Aquí no cambia nada — es el mismo formulario de
 * siempre, con el estado sacado a un sitio donde otro pueda usarlo.
 */
export function RsvpForm({ dictionary, seats, token, previous }: Props) {
  const rsvp = useRsvp({ dictionary, previous, seats })
  const attendingId = useId()
  const messageId = useId()

  if (rsvp.confirmed) {
    return (
      <div aria-live="polite" className="relative flex flex-col items-center gap-4" role="status">
        {/* La celebración de la maqueta, que se había quedado fuera: el invitado confirmaba
            y no pasaba nada. El color lo pone el diseño. */}
        <ConfettiBurst active />
        <p className="font-display text-[24px] font-light text-ink">{dictionary.successTitle}</p>
        <p className="text-[14px] leading-[1.7] text-ink-soft">{dictionary.successBody}</p>
        <button
          className="text-[11px] uppercase tracking-[var(--tracking-luxe)] text-gold-deep underline-offset-4 hover:underline"
          onClick={rsvp.reopen}
          type="button"
        >
          {dictionary.change}
        </button>
      </div>
    )
  }

  return (
    <form action={rsvp.formAction} className="flex w-full flex-col gap-5">
      <input name="token" type="hidden" value={token} readOnly />

      <label className={LABEL_CLASS} htmlFor={attendingId}>
        {dictionary.attendingLabel}
        <select className={FIELD_CLASS} defaultValue={rsvp.defaultAttending} id={attendingId} name="attending">
          {rsvp.options.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      </label>

      <label className={LABEL_CLASS} htmlFor={messageId}>
        {dictionary.messageLabel}
        <textarea className={FIELD_CLASS} defaultValue={rsvp.defaultMessage} id={messageId} maxLength={500} name="message" rows={3} />
      </label>

      {rsvp.error === null ? null : (
        <p className="text-[13px] text-gold-deep" role="alert">
          {rsvp.error}
        </p>
      )}

      <button
        className="rounded-[var(--radius-pill)] bg-gold px-7 py-3.5 text-[12px] uppercase tracking-[var(--tracking-luxe)] text-[var(--color-on-gold)] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        disabled={rsvp.isPending}
        type="submit"
      >
        {rsvp.isPending ? dictionary.sending : dictionary.submit}
      </button>
    </form>
  )
}
