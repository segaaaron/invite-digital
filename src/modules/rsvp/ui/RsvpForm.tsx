'use client'

import { useId, useState } from 'react'
import { ConfettiBurst } from '@/shared/design/ui/ConfettiBurst'
import type { InvitationDictionary } from '@/shared/i18n/dictionary'
import { useRsvp } from './use-rsvp'

const FIELD_CLASS =
  'w-full rounded-[12px] border-[1.5px] border-[var(--color-line)] bg-bg-top/80 px-3.5 py-3 text-[14px] text-ink outline-none transition-colors focus-visible:border-gold'

const LABEL_CLASS = 'flex flex-col gap-1.5 text-left text-[12px] font-bold tracking-[0.08em] text-ink-mute'

type Props = {
  dictionary: InvitationDictionary
  seats: number
  token: string
  /** La etiqueta del grupo: prellena el nombre, que es lo que el invitado dejaría escrito. */
  groupLabel: string
  previous: { attending: number; message: string | null; responderName: string | null } | null
}

/**
 * El formulario de RSVP, con la composición de la maqueta.
 *
 * Son cuatro piezas y en este orden: **nombre completo**, **¿asistirás?**, **mensaje** y un
 * botón a todo lo ancho. La piel la pone el diseño por variables CSS —aquí no hay ni un
 * color de la web pública—, así que el mismo marcado sale guinda en «Gala Real» y verde
 * salvia en la boda botánica.
 *
 * **El nombre existe porque el enlace identifica al grupo, no a la persona.** En «Familia
 * Rojas Peña» contesta uno de cuatro, y la pareja leía el mensaje sin saber cuál. Llega
 * prellenado con la etiqueta del grupo: quien no lo toque deja lo de siempre.
 *
 * **Y el recuento se queda, aunque la maqueta no lo pinte.** Su formulario es de mentira y
 * sólo pregunta sí o no; el nuestro alimenta el catering, las mesas y la puerta, y sin el
 * número no hay ninguna de las tres. Va **debajo del «sí»** y desaparece con el «no», que
 * es donde no estorba: quien no viene no tiene cuántos.
 */
export function RsvpForm({ dictionary, seats, token, groupLabel, previous }: Props) {
  const rsvp = useRsvp({ dictionary, previous, seats })
  const nameId = useId()
  const goingId = useId()
  const attendingId = useId()
  const messageId = useId()

  // Quién viene se decide con un sí o un no, y cuántos es un detalle del sí. El estado es
  // del formulario, no del servidor: lo que se envía sigue siendo un número.
  const [viene, setViene] = useState(rsvp.defaultAttending !== '0')

  if (rsvp.confirmed) {
    return (
      <div aria-live="polite" className="relative flex flex-col items-center gap-3 py-5" role="status">
        {/* La celebración de la maqueta, que se había quedado fuera: el invitado confirmaba
            y no pasaba nada. El color lo pone el diseño. */}
        <ConfettiBurst active />
        {/* En la caligrafía del diseño, que es como la maqueta saluda; sin ella, el titular
            de siempre. */}
        <p
          className="text-[32px] leading-tight font-light text-ink"
          style={{ fontFamily: 'var(--font-script, var(--font-display))' }}
        >
          {rsvp.confirmedName === null
            ? dictionary.successTitleAnon
            : dictionary.successTitle.replace('{nombre}', rsvp.confirmedName)}
        </p>
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
    <form action={rsvp.formAction} className="flex w-full flex-col gap-[18px] text-left">
      <input name="token" type="hidden" value={token} readOnly />

      <label className={LABEL_CLASS} htmlFor={nameId}>
        {dictionary.nameLabel}
        <input
          className={FIELD_CLASS}
          defaultValue={rsvp.defaultName || groupLabel}
          id={nameId}
          maxLength={120}
          name="name"
          placeholder={dictionary.namePlaceholder}
          type="text"
        />
      </label>

      <label className={LABEL_CLASS} htmlFor={goingId}>
        {dictionary.goingLabel}
        <select
          className={FIELD_CLASS}
          defaultValue={viene ? 'si' : 'no'}
          id={goingId}
          onChange={(evento) => setViene(evento.target.value === 'si')}
        >
          <option value="si">{dictionary.goingYes}</option>
          <option value="no">{dictionary.goingNo}</option>
        </select>
      </label>

      {/* El número va con el «sí» y se envía siempre: con el «no», cero. Un campo oculto es
          lo que impide que «no podré asistir» llegue al servidor sin cuántos. */}
      {viene ? (
        <label className={LABEL_CLASS} htmlFor={attendingId}>
          {dictionary.attendingLabel}
          <select className={FIELD_CLASS} defaultValue={rsvp.defaultAttending} id={attendingId} name="attending">
            {rsvp.options
              .filter((opcion) => opcion > 0)
              .map((opcion) => (
                <option key={opcion} value={opcion}>
                  {opcion}
                </option>
              ))}
          </select>
        </label>
      ) : (
        <input name="attending" type="hidden" value="0" readOnly />
      )}

      <label className={LABEL_CLASS} htmlFor={messageId}>
        {dictionary.messageLabel}
        <textarea
          className={`${FIELD_CLASS} min-h-[90px]`}
          defaultValue={rsvp.defaultMessage}
          id={messageId}
          maxLength={500}
          name="message"
          placeholder={dictionary.messagePlaceholder}
          rows={3}
        />
      </label>

      {rsvp.error === null ? null : (
        <p className="text-[13px] text-danger" role="alert">
          {rsvp.error}
        </p>
      )}

      <button
        className="w-full rounded-[12px] bg-gold px-7 py-4 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[var(--color-on-gold)] transition-transform duration-300 hover:-translate-y-0.5 hover:bg-gold-deep disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        disabled={rsvp.isPending}
        type="submit"
      >
        {rsvp.isPending ? dictionary.sending : dictionary.submit}
      </button>
    </form>
  )
}
