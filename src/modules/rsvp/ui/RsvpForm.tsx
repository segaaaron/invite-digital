'use client'

import { useId, useState } from 'react'
import { ConfettiBurst } from '@/shared/design/ui/ConfettiBurst'
import type { InvitationDictionary } from '@/shared/i18n/dictionary'
import { useRsvp } from './use-rsvp'

const FIELD_CLASS =
  'w-full rounded-[12px] border-[1.5px] border-[var(--color-line)] bg-bg-top/80 px-3.5 py-3 text-[14px] text-ink outline-none transition-colors focus-visible:border-gold'

const LABEL_CLASS =
  'flex flex-col gap-1.5 text-left text-[12px] font-bold tracking-[0.08em] text-[var(--color-form-label)]'

type Props = {
  dictionary: InvitationDictionary
  seats: number
  token: string
  /**
   * Cómo lo pinta el diseño.
   *
   * `campos` es el de los XV —nombre, «¿asistirás?», mensaje y un «ENVIAR» a todo lo
   * ancho—. `botones` es el de las bodas: dos botones, «ASISTIRÉ» y «NO PUEDO», y con el
   * sí un contador de invitados. Son dos formularios distintos en la maqueta, no uno con
   * otra piel.
   */
  variant?: 'campos' | 'botones' | undefined
  previous: { attending: number; message: string | null; responderName: string | null } | null
}

/**
 * El formulario de RSVP, con la composición de la maqueta.
 *
 * Son cuatro piezas y en este orden: **nombre completo**, **¿asistirás?**, **mensaje** y un
 * botón a todo lo ancho. Ni una más: lo que el diseño no pregunta, no se pregunta. La piel la pone el diseño por variables CSS —aquí no hay ni un
 * color de la web pública—, así que el mismo marcado sale guinda en «Gala Real» y verde
 * salvia en la boda botánica.
 *
 * **El nombre existe porque el enlace identifica al grupo, no a la persona.** En «Familia
 * Rojas Peña» contesta uno de cuatro, y la pareja leía el mensaje sin saber cuál. Va vacío
 * con su marcador, como en la maqueta: prellenarlo con la etiqueta del grupo hacía que la
 * mayoría la dejara puesta, y entonces el campo no dice nada que no supiéramos.
 *
 * **El recuento viaja oculto.** El diseño pregunta sí o no, y eso es lo que se ve; lo que
 * se manda son los cupos del grupo con el «sí» y cero con el «no», porque el catering, el
 * reparto de mesas y la puerta se hacen con ese número.
 */
export function RsvpForm({ dictionary, seats, token, previous, variant = 'campos' }: Props) {
  const rsvp = useRsvp({ dictionary, previous, seats })
  const nameId = useId()
  const goingId = useId()
  const messageId = useId()

  // Quién viene se decide con un sí o un no, y cuántos es un detalle del sí. El estado es
  // del formulario, no del servidor: lo que se envía sigue siendo un número.
  const [viene, setViene] = useState(rsvp.defaultAttending !== '0')
  // El contador del formulario de botones. Arranca en los cupos del grupo.
  const [cuantos, setCuantos] = useState(Number(rsvp.defaultAttending) || seats)
  // Con botones, nada se envía hasta que el invitado dice sí o no.
  const [respondido, setRespondido] = useState(false)

  /**
   * Ya contestaron: se ve lo dicho, no el formulario.
   *
   * Se responde **una sola vez** porque el enlace circula por el chat de toda la familia:
   * con el formulario abierto para siempre, cualquiera podría cambiar lo que dijeron los
   * demás. Corregir existe, pero lo reabre quien organiza el evento.
   */
  if (rsvp.yaRespondio && !rsvp.confirmed) {
    const vienen = previous?.attending ?? 0
    return (
      <div className="relative flex flex-col items-center gap-2.5 py-5 text-center" role="status">
        <p className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase">
          {dictionary.confirmedHeading}
        </p>
        <p className="text-[26px] leading-tight font-light text-ink" style={{ fontFamily: 'var(--font-script, var(--font-display))' }}>
          {vienen === 0 ? dictionary.confirmedNobody : dictionary.confirmedCount.replace('{n}', String(vienen)).replace('{total}', String(seats))}
        </p>
        <p className="max-w-[40ch] text-[13.5px] leading-[1.7] text-ink-soft">{dictionary.confirmedLocked}</p>
      </div>
    )
  }

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

  if (variant === 'botones') {
    const BOTON =
      'flex-1 rounded-[4px] border px-0 py-3.5 font-mono text-[10px] tracking-[0.28em] transition-colors duration-200'
    return (
      <form action={rsvp.formAction} className="flex w-full flex-col gap-2.5">
        <input name="token" type="hidden" value={token} readOnly />
        <input name="attending" type="hidden" value={viene ? String(cuantos) : '0'} readOnly />
        <input name="name" type="hidden" value={rsvp.defaultName} readOnly />

        <div className="flex gap-2">
          <button
            className={`${BOTON} ${viene && respondido ? 'border-transparent bg-[var(--color-cta)] font-bold text-[var(--color-on-cta)]' : 'border-[var(--color-line)] text-ink'}`}
            onClick={() => {
              setViene(true)
              setRespondido(true)
            }}
            type="button"
          >
            {dictionary.goingYesShort}
          </button>
          <button
            className={`${BOTON} ${!viene && respondido ? 'border-transparent bg-[var(--color-cta)] font-bold text-[var(--color-on-cta)]' : 'border-[var(--color-line)] text-ink'}`}
            onClick={() => {
              setViene(false)
              setRespondido(true)
            }}
            type="button"
          >
            {dictionary.goingNoShort}
          </button>
        </div>

        {/* Cuántos vienen: el contador de la maqueta, que solo aparece con el «sí». */}
        {respondido && viene ? (
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] tracking-[0.25em] opacity-70">{dictionary.guestsLabel}</span>
            <span className="flex items-center gap-2">
              <button
                aria-label="−"
                className="size-[30px] rounded-full border border-[var(--color-line)] text-ink"
                onClick={() => setCuantos((n) => Math.max(1, n - 1))}
                type="button"
              >
                −
              </button>
              <span className="min-w-6 text-center text-[16px]">{cuantos}</span>
              <button
                aria-label="+"
                className="size-[30px] rounded-full border border-[var(--color-line)] text-ink"
                onClick={() => setCuantos((n) => Math.min(seats, n + 1))}
                type="button"
              >
                +
              </button>
            </span>
          </div>
        ) : null}

        {rsvp.error === null ? null : (
          <p className="text-[13px] text-danger" role="alert">
            {rsvp.error}
          </p>
        )}

        {respondido ? (
          <button
            className="rounded-[4px] bg-[var(--color-cta)] px-0 py-3.5 font-mono text-[10px] font-semibold tracking-[0.3em] text-[var(--color-on-cta)] disabled:opacity-60"
            disabled={rsvp.isPending}
            type="submit"
          >
            {rsvp.isPending ? dictionary.sending : dictionary.submitLong}
          </button>
        ) : null}
      </form>
    )
  }

  return (
    <form action={rsvp.formAction} className="flex w-full flex-col gap-[18px] text-left">
      <input name="token" type="hidden" value={token} readOnly />

      <label className={LABEL_CLASS} htmlFor={nameId}>
        {dictionary.nameLabel}
        <input
          className={FIELD_CLASS}
          defaultValue={rsvp.defaultName}
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

      {/*
        Cuántos vienen **no se pregunta**: el diseño no lo pregunta. Va en un campo oculto
        —los cupos del grupo con el «sí», cero con el «no»—, porque el recuento es lo que
        alimenta el catering, el reparto de mesas y la puerta, y esas tres pantallas se
        quedan sin dato si el formulario no lo manda.
      */}
      <input name="attending" type="hidden" value={viene ? String(seats) : '0'} readOnly />

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
        className="w-full rounded-[12px] bg-[var(--color-cta)] px-7 py-4 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[var(--color-on-cta)] transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        disabled={rsvp.isPending}
        type="submit"
      >
        {rsvp.isPending ? dictionary.sending : dictionary.submit}
      </button>
    </form>
  )
}
