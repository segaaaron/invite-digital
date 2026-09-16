'use client'

import Link from 'next/link'
import { useActionState, useId, useState } from 'react'
import type { InvitationDictionary } from '@/shared/i18n/dictionary'
import { respondByPersonAction, type RsvpActionState } from '@/app/_acciones/rsvp/actions'
import { ConfettiBurst } from '@/shared/design/ui/ConfettiBurst'

const INICIAL: RsvpActionState = { status: 'idle' }

export type PersonaParaConfirmar = { readonly id: string; readonly fullName: string }

/**
 * La confirmación **nombre por nombre** de una familia o un grupo.
 *
 * Con un solo contador —«vienen 5 de 8»— no se sabe **quiénes**, y eso es justo lo que
 * necesitan el salón para sentar, la cocina para contar raciones y la puerta para saber a
 * quién espera. Aquí cada nombre tiene su sí y su no.
 *
 * **Se responde una sola vez.** El enlace acaba en el chat de toda la familia: si se pudiera
 * responder siempre, cualquiera podría cambiar lo que dijeron los demás. Corregir existe, pero
 * lo reabre quien organiza el evento.
 *
 * Todo el texto sale del diccionario del idioma del evento: esta pantalla la lee un invitado,
 * no el atelier.
 */
export function RsvpPorPersona({
  dictionary,
  token,
  seats,
  personas,
  volverHref,
  guestName,
  paseHref,
}: {
  dictionary: InvitationDictionary
  token: string
  seats: number
  personas: readonly PersonaParaConfirmar[]
  volverHref: string
  /** El nombre del invitado del enlace: responde él, sin escribirlo otra vez. */
  guestName: string
  /** Su pase de entrada, que se entrega al confirmar que viene alguien. */
  paseHref: string
}) {
  const [estado, confirmar, enviando] = useActionState(respondByPersonAction, INICIAL)
  const id = useId()
  const [vienen, setVienen] = useState<Record<string, boolean>>({})
  const [extra, setExtra] = useState(0)

  const marcados = personas.filter((p) => vienen[p.id] === true).length
  const cuposLibres = Math.max(seats - personas.length, 0)
  const total = marcados + extra

  if (estado.status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
        <ConfettiBurst active />
        <p className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase">{dictionary.confirmedHeading}</p>
        <p className="text-[30px] leading-tight font-light text-ink" style={{ fontFamily: 'var(--font-script, var(--font-display))' }}>
          {estado.responderName === null
            ? dictionary.successTitleAnon
            : dictionary.successTitle.replace('{nombre}', estado.responderName)}
        </p>
        <p className="text-[14px] leading-[1.7] text-ink-soft">{dictionary.successBody}</p>
        <p className="max-w-[40ch] text-[13px] leading-[1.7] text-ink-soft">{dictionary.confirmedLocked}</p>
        {estado.attending > 0 ? (
          <Link
            className="mt-2 inline-block rounded-[var(--radius-pill)] bg-[var(--color-cta)] px-6 py-3 font-mono text-[11px] tracking-[0.28em] text-[var(--color-on-cta)] uppercase"
            href={paseHref}
          >
            {dictionary.passOpen}
          </Link>
        ) : null}
        <Link className="text-[11px] tracking-[var(--tracking-luxe)] text-gold-deep uppercase underline-offset-4 hover:underline" href={volverHref}>
          {dictionary.backToInvitation}
        </Link>
      </div>
    )
  }

  return (
    <form action={confirmar} className="flex flex-col gap-6">
      <input name="token" readOnly type="hidden" value={token} />
      <input name="extra" readOnly type="hidden" value={String(extra)} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-soft uppercase">
          {dictionary.whoIsComing}
        </legend>

        {personas.map((persona) => {
          const viene = vienen[persona.id] === true
          return (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--color-line)] px-4 py-3" key={persona.id}>
              <span className="min-w-0 flex-1 text-[15px] text-ink">{persona.fullName}</span>
              {viene ? <input name="vienen" readOnly type="hidden" value={persona.id} /> : null}
              <span className="flex gap-2">
                {/* Sí y no explícitos, no una casilla: una casilla sin marcar no distingue
                    «no viene» de «todavía no lo he mirado». */}
                <button
                  aria-pressed={viene}
                  className={`rounded-[var(--radius-pill)] px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors ${
                    viene ? 'bg-[var(--color-cta)] text-[var(--color-on-cta)]' : 'border border-[var(--color-line)] text-ink'
                  }`}
                  onClick={() => setVienen((previo) => ({ ...previo, [persona.id]: true }))}
                  type="button"
                >
                  {dictionary.goingYesShort}
                </button>
                <button
                  aria-pressed={vienen[persona.id] === false}
                  className={`rounded-[var(--radius-pill)] px-4 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors ${
                    vienen[persona.id] === false ? 'bg-ink text-bg-raised' : 'border border-[var(--color-line)] text-ink'
                  }`}
                  onClick={() => setVienen((previo) => ({ ...previo, [persona.id]: false }))}
                  type="button"
                >
                  {dictionary.goingNoShort}
                </button>
              </span>
            </div>
          )
        })}
      </fieldset>

      {cuposLibres === 0 ? null : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-dashed border-[var(--color-line)] px-4 py-3">
          <span className="text-[13.5px] text-ink-soft">{dictionary.extraGuests.replace('{n}', String(cuposLibres))}</span>
          <span className="flex items-center gap-3">
            <button
              aria-label={dictionary.removeOne}
              className="size-8 rounded-full border border-[var(--color-line)] text-ink"
              onClick={() => setExtra((n) => Math.max(0, n - 1))}
              type="button"
            >
              −
            </button>
            <span className="min-w-[1.5rem] text-center text-[16px] text-ink [font-variant-numeric:lining-nums]">{extra}</span>
            <button
              aria-label={dictionary.addOne}
              className="size-8 rounded-full border border-[var(--color-line)] text-ink"
              onClick={() => setExtra((n) => Math.min(cuposLibres, n + 1))}
              type="button"
            >
              +
            </button>
          </span>
        </div>
      )}

      <p aria-live="polite" className="text-[14px] text-ink">
        {total === 0 ? dictionary.nobodyComing : dictionary.confirmedCount.replace('{n}', String(total)).replace('{total}', String(seats))}
      </p>

      <input name="name" readOnly type="hidden" value={guestName} />

      <label className="flex flex-col gap-2" htmlFor={`${id}-mensaje`}>
        <span className="font-mono text-[10px] tracking-[var(--tracking-luxe)] text-ink-soft uppercase">{dictionary.messageLabel}</span>
        <textarea
          className="w-full rounded-[10px] border border-[var(--color-line)] bg-[var(--color-bg-raised)] px-4 py-3 text-[15px] leading-[1.6] text-ink"
          id={`${id}-mensaje`}
          maxLength={500}
          name="message"
          placeholder={dictionary.messagePlaceholder}
          rows={3}
        />
      </label>

      {estado.status === 'error' ? (
        <p className="text-[13.5px] text-danger" role="alert">
          {dictionary.errors[estado.message]}
        </p>
      ) : null}

      <p className="text-[12px] leading-[1.6] text-ink-soft">{dictionary.answerOnce}</p>

      <button
        className="rounded-[var(--radius-pill)] bg-[var(--color-cta)] px-6 py-3.5 font-mono text-[11px] tracking-[0.28em] text-[var(--color-on-cta)] uppercase disabled:opacity-50"
        disabled={enviando}
        type="submit"
      >
        {enviando ? dictionary.sending : dictionary.submitLong}
      </button>
    </form>
  )
}
