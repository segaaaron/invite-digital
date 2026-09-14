'use client'

import { fechaHora } from '@/shared/format/fecha'
import { useState, useTransition } from 'react'
import { markReadAction, replyAction, toggleFeaturedAction } from '../actions'
import { createReply } from '../domain/message-note'
import type { GuestMessage } from '../domain/inbox'
import { avatarColor } from '@/modules/shell/ui/avatar-color'
import { isErr } from '@/shared/result'

type Props = {
  eventId: string
  eventSlug: string
  message: GuestMessage
}

const PILL =
  'cursor-pointer rounded-[var(--radius-pill)] border border-line-panel-strong bg-white px-4 py-2 font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink uppercase transition-colors hover:border-ink disabled:opacity-40'

const PILL_ON =
  'cursor-pointer rounded-[var(--radius-pill)] border border-shell-deep bg-linear-to-b from-shell to-shell-deep px-4.5 py-2.5 font-mono text-[10px] tracking-[0.25em] text-white uppercase transition-all duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-40 px-4 py-2 text-[9px]'

/** Panel en español: aquí no se negocia idioma, a diferencia de la página del invitado. */
const cuando = fechaHora

/**
 * Una firma del libro. El borde dorado marca lo que está sin leer, **y además** lleva la
 * palabra «Sin leer»: quien no distingue el dorado del gris tiene que poder saberlo
 * igual, y un color solo no es información.
 */
export function MessageCard({ eventId, eventSlug, message }: Props) {
  const [texto, setTexto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()

  const sinLeer = message.readAt === null
  const destacado = message.featuredAt !== null

  const correr = (accion: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null)
    empezar(async () => {
      const r = await accion()
      if (!r.ok) setError(r.message ?? 'No se pudo completar la operación.')
    })
  }

  const responder = () => {
    // La misma regla del dominio, aplicada antes de salir: el atelier ve el rechazo
    // mientras escribe en vez de esperar a que el servidor le diga lo que ya se sabía.
    const limpio = createReply(texto)
    if (isErr(limpio)) {
      setError(limpio.error.detail)
      return
    }

    correr(async () => {
      const r = await replyAction({ responseId: message.responseId, eventId, eventSlug, text: limpio.value })
      if (r.ok) setTexto('')
      return r
    })
  }

  return (
    <article
      className={`flex flex-col gap-3 rounded-[18px] border bg-linear-to-b from-bg-top to-white p-5 shadow-card ${
        sinLeer ? 'border-gold/60' : 'border-line-panel'
      }`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          {/* El avatar es decorativo: la etiqueta del grupo va escrita al lado. */}
          <span
            aria-hidden
            className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br font-display text-[16px] italic text-white ${avatarColor(message.groupLabel)}`}
          >
            {message.groupLabel.slice(0, 1)}
          </span>
          {/*
            Quién escribió, y de qué grupo. El enlace es del grupo —«Familia Rojas Peña»— y
            el mensaje lo escribe una persona: sin el nombre, la pareja lee «qué ganas de
            celebrar» sin saber cuál de los cuatro lo dijo. Sin nombre, la etiqueta sola,
            que es lo que había y lo que tienen todas las respuestas anteriores.
          */}
          <h3 className="text-[13px] font-medium text-ink">
            {message.responderName ?? message.groupLabel}
            {message.responderName === null ? null : (
              <span className="block text-[11px] font-normal text-ink-mute">{message.groupLabel}</span>
            )}
          </h3>
        </span>
        <div className="flex items-center gap-3">
          {sinLeer ? (
            <span className="rounded-[var(--radius-pill)] bg-pill-pending px-2.5 py-1 font-mono text-[9px] tracking-[0.25em] text-pill-pending-ink uppercase">
              Sin leer
            </span>
          ) : null}
          <time className="font-mono text-[10px] text-ink-mute" dateTime={message.writtenAt.toISOString()}>
            {cuando(message.writtenAt)}
          </time>
        </div>
      </header>

      <p className="text-[14px] leading-[1.7] text-ink">{message.body}</p>

      {message.reply === null ? null : (
        <div className="rounded-[14px] bg-bg-sunken px-4 py-3">
          <p className="font-mono text-[9px] uppercase tracking-[var(--tracking-luxe)] text-ink-mute">Tu respuesta</p>
          <p className="text-[13px] leading-[1.6] text-ink-soft">{message.reply}</p>
        </div>
      )}

      {/* Una sola fila de acciones: «Responder» se despliega debajo sin partir la fila en
          dos, que era lo que ponía dos hileras de botones en cada mensaje. */}
      <div className="flex flex-wrap items-start gap-2">
      <details className="group open:order-last open:basis-full">
        <summary className={`${PILL} w-fit list-none cursor-pointer`}>
          {message.reply === null ? 'Responder' : 'Editar respuesta'}
        </summary>
        <div className="mt-3 flex flex-col gap-2">
          <label
            className="font-mono text-[9px] tracking-[var(--tracking-luxe)] text-ink-mute uppercase"
            htmlFor={`respuesta-${message.responseId}`}
          >
            {`Responder a ${message.groupLabel}`}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="min-w-[220px] flex-1 rounded-[var(--radius-pill)] border border-line-panel-strong bg-white px-4 py-2 text-[13px] text-ink outline-none transition-colors focus-visible:border-ink"
              id={`respuesta-${message.responseId}`}
              onChange={(e) => setTexto(e.target.value)}
              type="text"
              value={texto}
            />
            <button className={PILL} disabled={pendiente} onClick={responder} type="button">
              Responder
            </button>
          </div>
        </div>
      </details>


        {sinLeer ? (
          <button
            className={PILL}
            disabled={pendiente}
            onClick={() => correr(() => markReadAction({ responseId: message.responseId, eventId, eventSlug }))}
            type="button"
          >
            Marcar leído
          </button>
        ) : null}
        <button
          aria-pressed={destacado}
          className={destacado ? PILL_ON : PILL}
          disabled={pendiente}
          onClick={() => correr(() => toggleFeaturedAction({ responseId: message.responseId, eventId, eventSlug }))}
          type="button"
        >
          {destacado ? 'Quitar destacado' : 'Destacar'}
        </button>
            </div>

      {error === null ? null : (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      )}
    </article>
  )
}
